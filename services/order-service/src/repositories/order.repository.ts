import { BaseRepository } from '@fs/shared';
import { PoolClient } from 'pg';

export interface Order {
  id: string;
  user_id: string | null;
  status: string;
  payment_method: string;
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  coupon_id?: string | null;
  shiprocket_order_id?: string | null;
  tracking_url?: string | null;
  guest_mobile?: string | null;
  guest_address?: string | null;
  guest_tracking_ref?: string | null;
  is_cod_confirmed: boolean;
  cod_confirm_by?: string | null;
  cod_fraud_flag: boolean;
  replacement_of?: string | null;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderData {
  user_id?: string | null;
  status: string;
  payment_method: string;
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  coupon_id?: string | null;
  tracking_url?: string | null;
  cod_confirm_by?: string | null;
  notes?: string | null;
  guest_mobile?: string | null;
  guest_address?: string | null;
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

  async getVariant(variantId: string) {
    const res = await this.query(`
      SELECT v.*, p.name 
      FROM variants v
      JOIN products p ON v.product_id = p.id
      WHERE v.id = $1 AND v.is_deleted = false
    `, [variantId]);
    return res.rows[0] ? { ...res.rows[0], weight: Number(res.rows[0].weight || 0.5) } : null;
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
  
  async createOrder(client: PoolClient, orderData: OrderData): Promise<Order> {
    const res = await client.query(`
      INSERT INTO orders (
        user_id, status, payment_method, subtotal, discount_amount, gst_amount, total_amount, 
        coupon_id, tracking_url, cod_confirm_by, notes, guest_mobile, guest_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      orderData.user_id, orderData.status, orderData.payment_method, orderData.subtotal,
      orderData.discount_amount, orderData.gst_amount, orderData.total_amount,
      orderData.coupon_id, orderData.tracking_url, orderData.cod_confirm_by, orderData.notes,
      orderData.guest_mobile, orderData.guest_address
    ]);
    return this.mapToCamelCase<Order>(res.rows[0]);
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

  async insertOrderStatusHistory(client: PoolClient, orderId: string, status: string, notes?: string, createdBy?: string | null) {
    await client.query(`
      INSERT INTO order_status_history (order_id, status, notes, created_by)
      VALUES ($1, $2, $3, $4)
    `, [orderId, status, notes, createdBy]);
  }

  async getOrderById(orderId: string, userId: string | null) {
    let query = `
      SELECT o.*, 
        json_agg(json_build_object(
          'id', oi.id, 'variant_id', oi.variant_id, 'quantity', oi.quantity, 
          'unit_price', oi.unit_price, 'gst_amount', oi.gst_amount
        )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
    `;
    
    const params: any[] = [orderId];
    
    // If userId is provided, add to filter (for security - users can only see their own orders)
    if (userId !== null) {
      query += ` AND o.user_id = $2`;
      params.push(userId);
    }
    
    query += ` GROUP BY o.id`;
    
    const res = await this.query(query, params);
    return res.rows[0] ? this.mapToCamelCase<Order>(res.rows[0]) : null;
  }
  
  async getOrderByTrackingToken(token: string): Promise<Order | null> {
    const res = await this.query(`
      SELECT * FROM orders WHERE tracking_url = $1
    `, [token]);
    return res.rows[0] ? this.mapToCamelCase<Order>(res.rows[0]) : null;
  }
  
  async updateOrderStatus(orderId: string, status: string): Promise<Order | null> {
    const res = await this.query(`
      UPDATE orders SET status = $1, updated_at = now() 
      WHERE id = $2 RETURNING *
    `, [status, orderId]);
    return res.rows[0] ? this.mapToCamelCase<Order>(res.rows[0]) : null;
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

  /**
   * Get order by Shiprocket order ID (tracking via webhook)
   */
  async getOrderByShiprocketId(shiprocketOrderId: string): Promise<Order | null> {
    const res = await this.query(`
      SELECT * FROM orders WHERE shiprocket_order_id = $1
    `, [shiprocketOrderId]);
    return res.rows[0] ? this.mapToCamelCase<Order>(res.rows[0]) : null;
  }

  /**
   * Get order items with product details
   */
  async getOrderItems(orderId: string) {
    const res = await this.query(`
      SELECT 
        oi.id,
        oi.order_id as "orderId",
        oi.variant_id as "variantId",
        oi.product_id as "productId",
        p.name as "productName",
        v.sku,
        v.weight,
        oi.quantity,
        oi.unit_price as "unitPrice",
        oi.gst_rate as "gstRate",
        oi.gst_amount as "gstAmount",
        oi.delivery_address_id as "deliveryAddressId",
        oi.gift_note as "giftNote"
      FROM order_items oi
      JOIN variants v ON oi.variant_id = v.id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);
    return res.rows;
  }

  async getUserDetails(userId: string) {
    const res = await this.query('SELECT email, mobile, name FROM users WHERE id = $1', [userId]);
    return res.rows[0] || null;
  }

  async getAddressById(addressId: string) {
    const res = await this.query('SELECT * FROM addresses WHERE id = $1', [addressId]);
    return res.rows[0] || null;
  }

  async getUserOrders(userId: string) {
    const res = await this.query(`
      SELECT id, status, total_amount, created_at 
      FROM orders 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [userId]);
    return res.rows;
  }

  /**
   * Update order with Shiprocket tracking details
   */
  async updateShiprocketDetails(orderId: string, details: { shiprocket_order_id: string; tracking_url: string }): Promise<Order | null> {
    const res = await this.query(`
      UPDATE orders 
      SET shiprocket_order_id = $1, tracking_url = $2, updated_at = now()
      WHERE id = $3 
      RETURNING *
    `, [details.shiprocket_order_id, details.tracking_url, orderId]);
    return res.rows[0] ? this.mapToCamelCase<Order>(res.rows[0]) : null;
  }

  async findAllForAdmin(filters: {
    page: number;
    limit: number;
    'filter[status]'?: string;
    'filter[payment_method]'?: string;
    'filter[created_at_from]'?: string;
    'filter[created_at_to]'?: string;
  }) {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;
    
    let whereQuery = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters['filter[status]']) {
      whereQuery += ` AND status = $${paramIndex++}`;
      params.push(filters['filter[status]']);
    }

    if (filters['filter[payment_method]']) {
      whereQuery += ` AND payment_method = $${paramIndex++}`;
      params.push(filters['filter[payment_method]']);
    }

    if (filters['filter[created_at_from]']) {
      whereQuery += ` AND created_at >= $${paramIndex++}`;
      params.push(filters['filter[created_at_from]']);
    }

    if (filters['filter[created_at_to]']) {
      whereQuery += ` AND created_at <= $${paramIndex++}`;
      params.push(filters['filter[created_at_to]']);
    }

    // Main query
    const query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereQuery}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders
      WHERE ${whereQuery}
    `;

    const recordsParams = [...params, limit, offset];
    
    const [records, countRes] = await Promise.all([
      this.query(query, recordsParams),
      this.query(countQuery, params)
    ]);

    return {
      items: records.rows.map(row => this.mapToCamelCase<any>(row)),
      total: parseInt(countRes.rows[0].total, 10)
    };
  }
}
