import { getDbPool, getRedisClient, AppError, ErrorCode, logger, withExternalRetry } from '@fs/shared';
import { Queue } from 'bullmq';
import { OrderRepository, Order } from '../repositories/order.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { ShiprocketClient } from './shiprocket.client';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { env } from '../config/env';

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

      const guestAddress = orderPayload.guest_address;
      const guestMobile = orderPayload.guest_mobile || guestAddress?.mobile || null;
      const formattedGuestAddress = guestAddress
        ? [guestAddress.line1, guestAddress.line2, guestAddress.city, guestAddress.state, guestAddress.pincode]
            .filter(Boolean)
            .join(', ')
        : null;

      let deliveryAddressId = orderPayload.address_id || null;
      if (userId) {
        if (!deliveryAddressId) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'address_id is required for authenticated checkout');
        }

        const address = await this.orderRepo.getAddressByIdForUser(deliveryAddressId, userId);
        if (!address) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'Address not found for this user');
        }
      } else {
        if (!guestAddress) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'guest_address is required for guest checkout');
        }

        const createdGuestAddress = await this.orderRepo.createGuestAddress(client, guestAddress);
        deliveryAddressId = createdGuestAddress.id;
      }
      
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
          delivery_address_id: deliveryAddressId
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
        guest_mobile: guestMobile,
        guest_address: formattedGuestAddress
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
      
      await this.orderRepo.insertOrderStatusHistory(client, {
        orderId: newOrder.id,
        status: newOrder.status,
        previousStatus: null,
        actorType: userId ? 'customer' : 'system',
        actorId: userId,
        note: 'Order placed',
      });
      
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
  
  async getOrderDetails(orderId: string, userId: string | null) {
    const order = await this.orderRepo.getOrderById(orderId, userId);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    
    // Include status history for timeline
    const history = await this.orderRepo.getOrderHistory(orderId);
    return { ...order, history };
  }

  async getAdminOrderDetails(orderId: string) {
    return this.getOrderDetails(orderId, null);
  }

  async getOrderTimeline(orderId: string, userId: string | null) {
    const order = await this.orderRepo.getOrderById(orderId, userId);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');

    const history = await this.orderRepo.getOrderHistory(orderId);
    return history.map((event: any) => ({
      status: event.status,
      timestamp: event.createdAt,
      actor:
        event.timelineActorId === order.user_id && event.timelineActorType === 'admin'
          ? 'customer'
          : event.timelineActorType,
      note: event.timelineNote || null,
    }));
  }

  async listOrdersForAdmin(filters: any) {
    return this.orderRepo.findAllForAdmin(filters);
  }

  async exportOrdersCsv(filters: any): Promise<string> {
    // Fetch a larger set for export (cap at 1000 for safety)
    const result = await this.orderRepo.findAllForAdmin({ ...filters, page: 1, limit: 1000 });
    const orders = result.items;

    if (orders.length === 0) return 'id,status,total_amount,payment_method,customer_name,customer_email,created_at';

    const headers = ['id', 'status', 'total_amount', 'payment_method', 'customer_name', 'customer_email', 'created_at'];
    const rows = orders.map(o => [
        o.id,
        o.status,
        o.totalAmount,
        o.paymentMethod,
        `"${o.customerName || ''}"`,
        o.customerEmail || '',
        o.createdAt
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async cancelOrder(orderId: string, adminId: string, reason: string) {
    const currentOrder = await this.orderRepo.getOrderById(orderId, null);
    if (!currentOrder) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    const cancellableStates = ['CONFIRMED', 'PACKED'];
    if (!cancellableStates.includes(currentOrder.status)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Only confirmed or packed orders can be cancelled (current: ${currentOrder.status})`
      );
    }

    const payment = await this.orderRepo.getPaymentByOrderId(orderId);
    if (payment?.status === 'CAPTURED' || payment?.status === 'PARTIALLY_REFUNDED') {
      const refundAmount = Number(payment.amount) - Number(payment.refund_amount || 0);
      if (refundAmount > 0) {
        const refund = await this.createRazorpayRefund(payment.razorpay_payment_id, refundAmount);
        const nextPaymentStatus = refundAmount < Number(payment.amount) ? 'PARTIALLY_REFUNDED' : 'REFUNDED';
        await this.orderRepo.markPaymentRefunded(orderId, nextPaymentStatus, refund.id, refundAmount);
      }
    }

    const order = await this.orderRepo.withTransaction(async (client) => {
      const updated = await this.orderRepo.updateOrderStatus(orderId, 'CANCELLED', client);
      await this.orderRepo.restockOrderItems(client, orderId);
      await this.orderRepo.insertOrderStatusHistory(client, {
        orderId,
        status: 'CANCELLED',
        previousStatus: currentOrder.status,
        actorType: 'admin',
        actorId: adminId,
        note: reason,
      });
      return updated;
    });

    await this.auditLogRepo.insert({
      adminId,
      action: 'ORDER_CANCELLED',
      entityType: 'ORDER',
      entityId: orderId,
      beforeJson: { status: currentOrder.status },
      afterJson: { status: 'CANCELLED', reason },
    });

    await this.eventQueue.add('order.cancelled', {
      orderId,
      previousStatus: currentOrder.status,
      reason,
    });

    return order;
  }

  async getPackingSlip(orderId: string) {
    const slip = await this.orderRepo.getPackingSlipData(orderId);
    if (!slip) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    return {
      orderNumber: slip.id,
      orderDate: slip.orderDate,
      customer: {
        name: slip.customerName,
        phone: slip.customerPhone,
        address: slip.customerAddress,
      },
      items: slip.items,
      totalItems: slip.items.reduce((sum: number, item: any) => sum + Number(item.qty), 0),
      paymentMethod: slip.paymentMethod,
      codAmount: slip.paymentMethod === 'COD' ? Number(slip.totalAmount) : null,
      specialInstructions: slip.specialInstructions,
    };
  }

  async getGstInvoice(orderId: string) {
    const invoice = await this.orderRepo.getGstInvoiceData(orderId);
    if (!invoice) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'GST invoice not found');
    }

    return invoice;
  }

  async exportBulkInvoicesCsv(filters: { dateFrom: string; dateTo: string }): Promise<string> {
    const invoices = await this.orderRepo.getBulkGstInvoiceData(filters);

    if (invoices.length === 0) {
      return 'order_id,order_number,invoice_number,customer,total_amount,gst_amount,issued_at,pdf_url';
    }

    const headers = ['order_id', 'order_number', 'invoice_number', 'customer', 'total_amount', 'gst_amount', 'issued_at', 'pdf_url'];
    const rows = invoices.map((invoice: any) => [
      invoice.orderId,
      invoice.orderNumber,
      invoice.invoiceNumber,
      `"${invoice.customer || ''}"`,
      invoice.totalAmount,
      invoice.gstAmount,
      invoice.issuedAt,
      invoice.pdfUrl || '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  async getPendingActionsDashboard() {
    return this.orderRepo.getPendingActionsDashboard();
  }

  async updateOrderStatus(orderId: string, status: string, adminId?: string, notes?: string) {
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
    
    // Add status history entry
    await this.orderRepo.insertOrderStatusHistory(null, {
      orderId,
      status,
      previousStatus: currentOrder.status,
      actorType: adminId ? 'admin' : 'system',
      actorId: adminId || null,
      note: notes || null,
    });

    // RULE 6: Log all status changes to audit trail
    if (adminId) {
      await this.auditLogRepo.insert({
        adminId,
        action: 'ORDER_STATUS_CHANGED',
        entityType: 'ORDER',
        entityId: orderId,
        beforeJson: { status: currentOrder.status },
        afterJson: { status: status, notes }
      });
    }
    
    // Emit event for status change (notification service will consume)
    await this.eventQueue.add('order.status_changed', {
      orderId: orderId,
      previousStatus: currentOrder.status,
      newStatus: status,
      notes
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
    
    await this.orderRepo.insertOrderStatusHistory(null, {
      orderId: order.id,
      status: internalStatus,
      previousStatus: order.status,
      actorType: 'courier',
      actorId: null,
      note: `Shiprocket webhook: ${shiprocketStatus}${tracking_number ? ` (${tracking_number})` : ''}`,
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
  async pushOrderToShiprocket(orderId: string, adminId?: string): Promise<any> {
    // ... logic remains same, just ensuring it's called by bulk
    return this._pushOrderToShiprocketInternal(orderId, adminId);
  }

  async bulkPushToShiprocket(orderIds: string[], adminId: string): Promise<any> {
    const results = [];
    for (const orderId of orderIds) {
      try {
        const res = await this._pushOrderToShiprocketInternal(orderId, adminId);
        results.push({ orderId, success: true, data: res });
      } catch (error) {
        results.push({ 
          orderId, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    return results;
  }

  async bulkUpdateOrderStatus(orderIds: string[], status: string, adminId: string, notes?: string): Promise<any> {
    const results = [];
    for (const orderId of orderIds) {
      try {
        const order = await this.updateOrderStatus(orderId, status, adminId, notes);
        results.push({ orderId, success: true, data: order });
      } catch (error) {
        results.push({ 
          orderId, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    return results;
  }

  private async _pushOrderToShiprocketInternal(orderId: string, adminId?: string): Promise<any> {
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
        pickup_location: env.SHIPROCKET_PICKUP_LOCATION,
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

      // RULE 6: Log push to shiprocket
      if (adminId) {
        await this.auditLogRepo.insert({
          adminId,
          action: 'PUSHED_TO_SHIPROCKET',
          entityType: 'ORDER',
          entityId: orderId,
          afterJson: { shiprocket_order_id: response.token, shipment_id: shipmentId }
        });
      }

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

  private async createRazorpayRefund(razorpayPaymentId: string | null | undefined, amount: number) {
    if (!razorpayPaymentId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Missing Razorpay payment id for refund');
    }

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Razorpay credentials are not configured');
    }

    try {
      const response = await withExternalRetry(
        () => axios.post(
          `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
          {
            amount: Math.round(amount * 100),
            speed: 'normal',
          },
          {
            auth: {
              username: keyId,
              password: keySecret,
            },
            timeout: 10000,
          }
        ),
        {
          method: 'POST',
          idempotent: false,
          operation: 'razorpay.refund'
        }
      );

      return response.data as { id: string };
    } catch (error) {
      logger.error({ razorpayPaymentId, amount, error }, 'Failed to create Razorpay refund');
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Unable to create Razorpay refund');
    }
  }
}
