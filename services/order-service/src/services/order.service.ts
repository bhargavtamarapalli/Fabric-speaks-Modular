import { getDbPool, AppError, ErrorCode, logger } from '@fs/shared';
import { OrderRepository } from '../repositories/order.repository';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export class OrderService {
  constructor(private orderRepo: OrderRepository) {}
  
  async placeOrder(userId: string, orderPayload: any) {
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
        coupon_id: couponId, tracking_url: trackingUrl, cod_confirm_by: null, notes: null
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
      if (isCOD) {
        const cancels = await this.orderRepo.checkCODHistoryFlag(userId);
        if (cancels >= 2) {
          await this.orderRepo.flagOrderForCOD_Fraud(newOrder.id);
        }
      }

      await this.orderRepo.clearUserCart(client, userId);
      
      await client.query('COMMIT');
      
      // Emit BullMQ event here in real app
      // await eventQueue.add('order.created', { orderId: newOrder.id });

      return newOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMyOrders(userId: string) {
    const res = await getDbPool().query(`
      SELECT id, status, total_amount, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
    `, [userId]);
    return res.rows;
  }
  
  async getOrderDetails(orderId: string, userId: string) {
    const order = await this.orderRepo.getOrderById(orderId, userId);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, status: string) {
    // Basic status machine validation
    const validStates = ['PAYMENT_PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStates.includes(status)) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid state');
    
    const order = await this.orderRepo.updateOrderStatus(orderId, status);
    // emit webhook or event internally
    return order;
  }

  async getOrderByTrackingToken(token: string) {
    const order = await this.orderRepo.getOrderByTrackingToken(token);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    return order;
  }
}
