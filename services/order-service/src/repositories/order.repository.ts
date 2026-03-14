import { BaseRepository } from '@fs/shared';
import { PoolClient } from 'pg';

export interface OrderData {
  user_id: string;
  status: string;
  payment_method: string;
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  coupon_id?: string;
  tracking_url?: string;
  cod_confirm_by?: string;
  notes?: string;
}

export interface OrderItemData {
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  delivery_address_id: string;
}

export class OrderRepository extends BaseRepository {

  async getVariantForLock(client: PoolClient, variantId: string) {
    const res = await client.query(`
      SELECT v.id, v.qty, v.base_price, v.sale_price, v.sale_active, v.version, p.name 
      FROM variants v
      JOIN products p ON v.product_id = p.id
      WHERE v.id = $1 AND v.is_deleted = false
    `, [variantId]);
    return res.rows[0] || null;
  }

  async lockStockWithOCC(client: PoolClient, variantId: string, version: number, decrementQty: number) {
    // Optimistic Concurrency Control
    const res = await client.query(`
      UPDATE variants 
      SET qty = qty - $1, version = version + 1
      WHERE id = $2 AND version = $3 AND qty >= $1
      RETURNING id, qty, version
    `, [decrementQty, variantId, version]);
    
    return res.rows.length > 0;
  }
  
  async createOrder(client: PoolClient, orderData: OrderData) {
    const res = await client.query(`
      INSERT INTO orders (
        user_id, status, payment_method, subtotal, discount_amount, gst_amount, total_amount, 
        coupon_id, tracking_url, cod_confirm_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      orderData.user_id, orderData.status, orderData.payment_method, orderData.subtotal,
      orderData.discount_amount, orderData.gst_amount, orderData.total_amount,
      orderData.coupon_id, orderData.tracking_url, orderData.cod_confirm_by, orderData.notes
    ]);
    return res.rows[0];
  }

  async createOrderItem(client: PoolClient, itemData: OrderItemData) {
    const res = await client.query(`
      INSERT INTO order_items (
        order_id, variant_id, product_id, quantity, unit_price, gst_rate, gst_amount, delivery_address_id
      ) VALUES ($1, $2, (SELECT product_id FROM variants WHERE id = $2), $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      itemData.order_id, itemData.variant_id, itemData.quantity, itemData.unit_price, 
      itemData.gst_rate, itemData.gst_amount, itemData.delivery_address_id
    ]);
    return res.rows[0];
  }

  async createGstInvoice(client: PoolClient, invoiceData: any) {
    const res = await client.query(`
      INSERT INTO gst_invoices (order_id, invoice_number, total_amount, gst_amount)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [invoiceData.order_id, invoiceData.invoice_number, invoiceData.total_amount, invoiceData.gst_amount]);
    return res.rows[0];
  }

  async insertOrderStatusHistory(client: PoolClient, orderId: string, status: string, notes?: string, createdBy?: string) {
    await client.query(`
      INSERT INTO order_status_history (order_id, status, notes, created_by)
      VALUES ($1, $2, $3, $4)
    `, [orderId, status, notes, createdBy]);
  }

  async getOrderById(orderId: string, userId: string) {
    const res = await this.query(`
      SELECT o.*, 
        json_agg(json_build_object(
          'id', oi.id, 'variant_id', oi.variant_id, 'quantity', oi.quantity, 
          'unit_price', oi.unit_price, 'gst_amount', oi.gst_amount
        )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id
    `, [orderId, userId]);
    return res.rows[0] ? this.mapToCamelCase(res.rows[0]) : null;
  }
  
  async getOrderByTrackingToken(token: string) {
    const res = await this.query(`
      SELECT * FROM orders WHERE tracking_url = $1
    `, [token]);
    return res.rows[0] ? this.mapToCamelCase(res.rows[0]) : null;
  }
  
  async updateOrderStatus(orderId: string, status: string) {
    const res = await this.query(`
      UPDATE orders SET status = $1, updated_at = now() 
      WHERE id = $2 RETURNING *
    `, [status, orderId]);
    return res.rows[0] ? this.mapToCamelCase(res.rows[0]) : null;
  }

  async checkCODHistoryFlag(userId: string) {
    const res = await this.query(`
      SELECT COUNT(*) as cancels 
      FROM orders 
      WHERE user_id = $1 AND payment_method = 'COD' AND status = 'CANCELLED'
    `, [userId]);
    return res.rows[0] ? parseInt(res.rows[0].cancels, 10) : 0;
  }
  
  async flagOrderForCOD_Fraud(orderId: string) {
    await this.query(`UPDATE orders SET cod_fraud_flag = true WHERE id = $1`, [orderId]);
  }

  async clearUserCart(client: PoolClient, userId: string) {
    await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
  }
}
