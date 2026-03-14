import { getDbPool, getRedisClient, AppError, ErrorCode, logger } from '@fs/shared';
import { Queue } from 'bullmq';
import { OrderRepository, Order } from '../repositories/order.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { ShiprocketClient } from './shiprocket.client';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export class OrderService {
  private eventQueue: Queue;

  constructor(
    private orderRepo: OrderRepository,
    private auditLogRepo: AuditLogRepository,
    private shiprocketClient?: ShiprocketClient
  ) {
    // Initialize Shiprocket client if not provided
    if (!this.shiprocketClient) {
      try {
        this.shiprocketClient = new ShiprocketClient();
      } catch (error) {
        logger.warn('Shiprocket client initialization failed, webhook handling will be limited');
      }
    }

    // Initialize BullMQ queue for order events
    const redis = getRedisClient();
    this.eventQueue = new Queue('order_events', { connection: redis });
  }
  
  async placeOrder(userId: string | null, orderPayload: any) {
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let subtotal = 0;
      let totalGst = 0;
      const verifiedItems = [];
      
      for (const item of orderPayload.cart_items) {
        const variant = await this.orderRepo.getVariantForLock(client, item.variant_id);
        
        if (!variant) {
          throw new AppError(ErrorCode.VARIANT_NOT_FOUND, 'Variant not found');
        }
        if (variant.qty < item.quantity) {
          throw new AppError(ErrorCode.STOCK_UNAVAILABLE, `Stock unavailable for ${variant.name}`);
        }
        
        // Lock stock using OCC
        const locked = await this.orderRepo.lockStockWithOCC(client, item.variant_id, variant.version, item.quantity);
        if (!locked) {
          throw new AppError(ErrorCode.INTERNAL_ERROR, `Concurrent stock update failed for ${variant.name}. Please try again.`);
        }
        
        // Calculate price
        const unitPrice = variant.sale_active ? Number(variant.sale_price) : Number(variant.base_price);
        const taxableAmount = unitPrice * item.quantity;
        
        let gstRate = 0;
        if (unitPrice <= 999) gstRate = 0.00;
        else if (unitPrice <= 1499) gstRate = 0.05;
        else gstRate = 0.12;
        
        const gstAmount = taxableAmount * gstRate;
        
        subtotal += taxableAmount;
        totalGst += gstAmount;
        
        verifiedItems.push({
          variant_id: item.variant_id,
          product_id: variant.product_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          delivery_address_id: orderPayload.address_id
        });
      }
      
      let discountAmount = 0;
      let couponId = null;
      // Coupon logic omitted for brevity (requires full Coupon DB mapping)
      
      const totalAmount = subtotal - discountAmount + totalGst;
      
      // Guest tracking token
      const trackingUrl = randomBytes(16).toString('hex');
      
      const isCOD = orderPayload.payment_method === 'COD';
      
      const newOrder = await this.orderRepo.createOrder(client, {
        user_id: userId,
        status: isCOD ? 'CONFIRMED' : 'PAYMENT_PENDING',
        payment_method: orderPayload.payment_method,
        subtotal, discount_amount: discountAmount, gst_amount: totalGst, total_amount: totalAmount,
        coupon_id: couponId, tracking_url: trackingUrl, cod_confirm_by: null, notes: null,
        guest_mobile: orderPayload.guest_mobile,
        guest_address: orderPayload.guest_address
      });
      
      for (const vItem of verifiedItems) {
        await this.orderRepo.createOrderItem(client, {
          order_id: newOrder.id,
          ...vItem
        });
      }
      
      await this.orderRepo.createGstInvoice(client, {
        order_id: newOrder.id,
        invoice_number: `FS-2324-${Math.floor(Math.random() * 90000) + 10000}`,
        total_amount: totalAmount,
        gst_amount: totalGst
      });
      
      await this.orderRepo.insertOrderStatusHistory(client, newOrder.id, newOrder.status, 'Order Placed', userId);
      
      // Optional: COD Fraud Flag Check
      if (isCOD && userId) {
        const cancels = await this.orderRepo.checkCODHistoryFlag(userId);
        if (cancels >= 2) {
          await this.orderRepo.flagOrderForCOD_Fraud(newOrder.id);
        }
      }

      if (userId) {
        await this.orderRepo.clearUserCart(client, userId);
      }
      
      await client.query('COMMIT');
      
      // RULE 5: Emit order.created event for downstream services (notification, loyalty, etc.)
      await this.eventQueue.add('order.created', { 
        orderId: newOrder.id,
        userId: userId,
        totalAmount: totalAmount,
        paymentMethod: orderPayload.payment_method,
        status: newOrder.status
      });

      return newOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMyOrders(userId: string) {
    return this.orderRepo.getUserOrders(userId);
  }
  
  async getOrderDetails(orderId: string, userId: string) {
    const order = await this.orderRepo.getOrderById(orderId, userId);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, status: string) {
    // Fetch current order state before update (for audit trail and validation)
    const currentOrder = await this.orderRepo.getOrderById(orderId, null);
    if (!currentOrder) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    // Define valid state transitions per order status
    const stateTransitions: Record<string, string[]> = {
      'PLACED': ['PAYMENT_PENDING', 'CANCELLED'],
      'PAYMENT_PENDING': ['CONFIRMED', 'PAYMENT_FAILED', 'CANCELLED'],
      'PAYMENT_FAILED': ['PAYMENT_PENDING', 'CANCELLED'],
      'CONFIRMED': ['PACKED', 'CANCELLED'],
      'PACKED': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED', 'CANCELLED'],
      'DELIVERED': ['CANCELLED'],  // Return initiated separately
      'CANCELLED': []  // Terminal state
    };

    const allowedStates = stateTransitions[currentOrder.status] || [];

    // Validate status transition
    if (!allowedStates.includes(status)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Invalid status transition from ${currentOrder.status} to ${status}`,
        {
          current_status: currentOrder.status,
          requested_status: status,
          allowed_states: allowedStates
        }
      );
    }
    
    const order = await this.orderRepo.updateOrderStatus(orderId, status);
    
    // RULE 6: Log all status changes to audit trail
    await this.auditLogRepo.insert({
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: orderId,
      beforeJson: { status: currentOrder.status },
      afterJson: { status: status }
    });
    
    // Emit event for status change (notification service will consume)
    await this.eventQueue.add('order.status_changed', {
      orderId: orderId,
      previousStatus: currentOrder.status,
      newStatus: status
    });
    
    logger.info(`Order status updated`, { orderId, fromStatus: currentOrder.status, toStatus: status });
    return order;
  }

  async getOrderByTrackingToken(token: string) {
    const order = await this.orderRepo.getOrderByTrackingToken(token);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    return order;
  }

  /**
   * Handle Shiprocket webhook events
   * Maps Shiprocket status codes to internal order status
   * Shiprocket events: order_picked, in_transit, delivered, cancelled, lost, rto etc.
   */
  async handleShiprocketWebhook(payload: any) {
    const { order_id: shiprocketOrderId, status: shiprocketStatus, tracking_number } = payload;

    if (!shiprocketOrderId || !shiprocketStatus) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Missing required webhook fields');
    }

    // Map Shiprocket status to internal order status
    const statusMap: Record<string, string> = {
      'order_picked': 'PACKED',
      'in_transit': 'SHIPPED',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED',
      'lost': 'CANCELLED',
      'rto': 'CANCELLED',
      'rto_picked': 'CANCELLED',
      'rto_delivered': 'CANCELLED'
    };

    const internalStatus = statusMap[shiprocketStatus];
    if (!internalStatus) {
      logger.warn(`Unknown Shiprocket status: ${shiprocketStatus}, skipping webhook processing`);
      return { acknowledged: true, message: 'Unknown status, skipped' };
    }

    // Find order by Shiprocket order ID
    const order = await this.orderRepo.getOrderByShiprocketId(shiprocketOrderId);
    if (!order) {
      logger.warn(`Webhook for unknown Shiprocket order: ${shiprocketOrderId}`);
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found for this Shiprocket ID');
    }

    // Update order status
    const updatedOrder = await this.orderRepo.updateOrderStatus(order.id, internalStatus);
    
    // Audit log the status change
    await this.auditLogRepo.insert({
      action: 'ORDER_STATUS_CHANGED_VIA_WEBHOOK',
      entityType: 'ORDER',
      entityId: order.id,
      beforeJson: { status: order.status, shiprocketStatus: shiprocketStatus },
      afterJson: { status: internalStatus, trackingNumber: tracking_number }
    });

    // Emit event for status change (notification service will consume)
    await this.eventQueue.add('order.status_changed', {
      orderId: order.id,
      previousStatus: order.status,
      newStatus: internalStatus,
      shiprocketStatus: shiprocketStatus,
      trackingNumber: tracking_number
    });
    
    logger.info(`Webhook processed: Order ${order.id} status updated to ${internalStatus}`);
    
    return { 
      acknowledged: true, 
      orderId: order.id, 
      newStatus: internalStatus,
      trackingNumber: tracking_number
    };
  }

  /**
   * Push confirmed order to Shiprocket for fulfillment
   * Called by admin when order is CONFIRMED and ready to ship
   * Creates Shiprocket order and stores shipment ID for tracking
   */
  async pushOrderToShiprocket(orderId: string): Promise<any> {
    if (!this.shiprocketClient) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Shiprocket client not initialized');
    }

    // Fetch full order details
    const order = await this.orderRepo.getOrderById(orderId, null);
    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    if (order.status !== 'CONFIRMED') {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Order must be CONFIRMED to push to Shiprocket (current: ${order.status})`
      );
    }

    if (order.shiprocket_order_id) {
      logger.warn('Order already pushed to Shiprocket', { orderId });
      return {
        already_synced: true,
        shiprocket_order_id: order.shiprocket_order_id,
        tracking_url: order.tracking_url
      };
    }

    try {
      // Fetch variant details to get actual weight
      const orderItems = await this.orderRepo.getOrderItems(orderId);
      let totalWeight = 0;
      const detailedItems = [];
      let firstAddressId = '';
      
      for (const item of orderItems) {
        const weight = Number(item.weight) || 0.5;
        totalWeight += weight * item.quantity;
        if (!firstAddressId) firstAddressId = item.deliveryAddressId;
        
        detailedItems.push({
          name: item.productName || `Product ${item.productId}`,
          sku: item.sku || item.variantId,
          units: item.quantity,
          selling_price: Number(item.unitPrice)
        });
      }

      // Fetch customer details (email and phone)
      let customerEmail = 'guest@fabricspeaks.in';
      let customerPhone = order.guest_mobile || '+919999999999';
      let customerName = 'Customer';
      let addressDetails = {
        address: order.guest_address || 'N/A',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400000'
      };

      if (order.user_id) {
          const user = await this.orderRepo.getUserDetails(order.user_id);
          if (user) {
              customerEmail = user.email || customerEmail;
              customerPhone = user.mobile || customerPhone;
              customerName = user.name || customerName;
          }
      } else {
          customerName = 'Guest';
      }

      // Fetch real address from DB if we have an addressId
      if (firstAddressId) {
          const addr = await this.orderRepo.getAddressById(firstAddressId);
          if (addr) {
              addressDetails = {
                  address: `${addr.line1}, ${addr.line2 || ''}`,
                  city: addr.city,
                  state: addr.state,
                  pincode: addr.pincode
              };
              customerPhone = addr.mobile || customerPhone;
              customerName = addr.full_name || customerName;
          }
      }

      // Map to Shiprocket format
      const shiprocketOrder = {
        order_id: order.id,
        order_date: order.created_at.toISOString(),
        pickup_location: 'Primary',
        billing_customer_name: customerName,
        billing_email: customerEmail,
        billing_phone: customerPhone,
        billing_address: addressDetails.address,
        billing_city: addressDetails.city,
        billing_state: addressDetails.state,
        billing_country: 'IN',
        billing_pincode: addressDetails.pincode,
        shipping_is_billing: true,
        order_items: detailedItems,
        payment_method: order.payment_method,
        sub_total: Number(order.subtotal),
        weight: totalWeight || 0.5
      };

      // Call Shiprocket API
      const response = await this.shiprocketClient.createOrder(shiprocketOrder);

      // Update order with Shiprocket IDs
      const shipmentId = response.data?.shipment_id;
      if (!shipmentId) {
          throw new AppError(ErrorCode.INTERNAL_ERROR, 'Shiprocket failed to return shipment_id');
      }

      const trackingUrl = await this.shiprocketClient.getTrackingUrl(shipmentId);

      await this.orderRepo.updateShiprocketDetails(orderId, {
        shiprocket_order_id: response.token || String(shipmentId),
        tracking_url: trackingUrl
      });

      logger.info('Order successfully pushed to Shiprocket', {
        orderId,
        shipmentId,
        shiprocketOrderId: response.token
      });

      return {
        success: true,
        shiprocket_order_id: response.token,
        shipment_id: shipmentId,
        tracking_url: trackingUrl
      };
    } catch (error) {
      logger.error('Failed to push order to Shiprocket', {
        orderId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
