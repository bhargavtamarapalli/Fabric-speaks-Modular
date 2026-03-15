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

export interface GuestAddressData {
  full_name: string;
  mobile: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  user_id: string;
  razorpay_payment_id: string | null;
  status: string;
  amount: number;
  refund_id: string | null;
  refund_amount: number | null;
}

export interface OrderHistoryInsert {
  orderId: string;
  status: string;
  previousStatus?: string | null;
  actorType?: 'customer' | 'admin' | 'courier' | 'system';
  actorId?: string | null;
  note?: string | null;
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

  async createGuestAddress(client: PoolClient, addressData: GuestAddressData): Promise<{ id: string }> {
    const res = await client.query(
      `INSERT INTO addresses (user_id, label, full_name, mobile, line1, line2, city, state, pincode)
       VALUES (NULL, 'Guest Checkout', $1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        addressData.full_name,
        addressData.mobile,
        addressData.line1,
        addressData.line2 || null,
        addressData.city,
        addressData.state,
        addressData.pincode,
      ]
    );

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

  async insertOrderStatusHistory(client: PoolClient | null, entry: OrderHistoryInsert) {
    const queryStr = `
      INSERT INTO order_status_history (
        order_id,
        status,
        previous_status,
        actor_type,
        actor_id,
        note,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $6, $5)
    `;
    const params = [
      entry.orderId,
      entry.status,
      entry.previousStatus || null,
      entry.actorType || 'system',
      entry.actorId || null,
      entry.note || null,
    ];

    if (client) {
        await client.query(queryStr, params);
    } else {
        await this.query(queryStr, params);
    }
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

  async getOrderHistory(orderId: string) {
    const res = await this.query(`
      SELECT
        h.*,
        COALESCE(h.note, h.notes) AS timeline_note,
        COALESCE(h.actor_id, h.created_by) AS timeline_actor_id,
        COALESCE(h.actor_type, CASE
          WHEN COALESCE(h.note, h.notes, '') ILIKE 'Shiprocket webhook:%' THEN 'courier'
          WHEN COALESCE(h.actor_id, h.created_by) IS NOT NULL THEN 'admin'
          ELSE 'system'
        END) AS timeline_actor_type,
        u.name as created_by_name
      FROM order_status_history h
      LEFT JOIN users u ON COALESCE(h.actor_id, h.created_by) = u.id
      WHERE h.order_id = $1
      ORDER BY h.created_at ASC
    `, [orderId]);
    return res.rows.map(row => this.mapToCamelCase<any>(row));
  }
  
  async getOrderByTrackingToken(token: string): Promise<Order | null> {
    const res = await this.query(`
      SELECT * FROM orders WHERE tracking_url = $1
    `, [token]);
    return res.rows[0] ? this.mapToCamelCase<Order>(res.rows[0]) : null;
  }
  
  async updateOrderStatus(orderId: string, status: string, client?: PoolClient): Promise<Order | null> {
    const db = client || this.db;
    const res = await db.query(`
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

  async getAddressByIdForUser(addressId: string, userId: string) {
    const res = await this.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [addressId, userId]
    );
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

  async getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const res = await this.query(
      `SELECT id, order_id, user_id, razorpay_payment_id, status, amount, refund_id, refund_amount
       FROM payments
       WHERE order_id = $1`,
      [orderId]
    );

    return res.rows[0] || null;
  }

  async markPaymentRefunded(
    orderId: string,
    status: 'REFUNDED' | 'PARTIALLY_REFUNDED',
    refundId: string,
    refundAmount: number
  ): Promise<void> {
    await this.query(
      `UPDATE payments
       SET status = $2, refund_id = $3, refund_amount = $4, updated_at = now()
       WHERE order_id = $1`,
      [orderId, status, refundId, refundAmount]
    );
  }

  async restockOrderItems(client: PoolClient, orderId: string): Promise<void> {
    await client.query(
      `UPDATE variants v
       SET qty = v.qty + items.quantity_delta,
           version = v.version + 1
       FROM (
         SELECT variant_id, SUM(quantity)::integer AS quantity_delta
         FROM order_items
         WHERE order_id = $1
         GROUP BY variant_id
       ) items
       WHERE v.id = items.variant_id`,
      [orderId]
    );
  }

  async getPackingSlipData(orderId: string) {
    const orderRes = await this.query(
      `SELECT
          o.id,
          o.created_at AS "orderDate",
          o.payment_method AS "paymentMethod",
          o.total_amount AS "totalAmount",
          o.notes AS "specialInstructions",
          COALESCE(addr.full_name, u.name, 'Customer') AS "customerName",
          COALESCE(addr.mobile, o.guest_mobile, u.mobile) AS "customerPhone",
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(', ', addr.line1, addr.line2, addr.city, addr.state, addr.pincode)), ''),
            o.guest_address
          ) AS "customerAddress"
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN LATERAL (
          SELECT a.*
          FROM order_items oi
          JOIN addresses a ON a.id = oi.delivery_address_id
          WHERE oi.order_id = o.id
          ORDER BY oi.created_at ASC
          LIMIT 1
       ) addr ON true
       WHERE o.id = $1`,
      [orderId]
    );

    if (!orderRes.rows[0]) {
      return null;
    }

    const itemsRes = await this.query(
      `SELECT
          p.name AS "productName",
          p.fabric_type AS "fabricType",
          v.size,
          v.colour,
          oi.quantity AS qty,
          v.sku
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN variants v ON v.id = oi.variant_id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [orderId]
    );

    return {
      ...orderRes.rows[0],
      items: itemsRes.rows.map((item) => ({ ...item, qty: Number(item.qty) })),
    };
  }

  async getGstInvoiceData(orderId: string) {
    const invoiceRes = await this.query(
      `SELECT
          gi.invoice_number AS "invoiceNumber",
          gi.pdf_url AS "pdfUrl",
          gi.total_amount AS "totalAmount",
          gi.gst_amount AS "gstAmount",
          gi.created_at AS "issuedAt",
          o.id AS "orderNumber",
          o.payment_method AS "paymentMethod",
          COALESCE(addr.full_name, u.name, 'Customer') AS "customerName",
          COALESCE(addr.mobile, o.guest_mobile, u.mobile) AS "customerPhone",
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(', ', addr.line1, addr.line2, addr.city, addr.state, addr.pincode)), ''),
            o.guest_address
          ) AS "customerAddress"
       FROM gst_invoices gi
       JOIN orders o ON o.id = gi.order_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN LATERAL (
          SELECT a.*
          FROM order_items oi
          JOIN addresses a ON a.id = oi.delivery_address_id
          WHERE oi.order_id = o.id
          ORDER BY oi.created_at ASC
          LIMIT 1
       ) addr ON true
       WHERE gi.order_id = $1`,
      [orderId]
    );

    if (!invoiceRes.rows[0]) {
      return null;
    }

    const itemsRes = await this.query(
      `SELECT
          p.name AS "productName",
          oi.quantity AS qty,
          oi.unit_price AS "unitPrice",
          oi.gst_rate AS "gstRate",
          oi.gst_amount AS "gstAmount"
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [orderId]
    );

    return {
      ...invoiceRes.rows[0],
      totalAmount: Number(invoiceRes.rows[0].totalAmount),
      gstAmount: Number(invoiceRes.rows[0].gstAmount),
      items: itemsRes.rows.map((item) => ({
        ...item,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        gstRate: Number(item.gstRate),
        gstAmount: Number(item.gstAmount),
      })),
    };
  }

  async getBulkGstInvoiceData(filters: {
    dateFrom: string;
    dateTo: string;
  }) {
    const res = await this.query(
      `SELECT
          gi.order_id AS "orderId",
          gi.invoice_number AS "invoiceNumber",
          gi.pdf_url AS "pdfUrl",
          gi.total_amount AS "totalAmount",
          gi.gst_amount AS "gstAmount",
          gi.created_at AS "issuedAt",
          o.created_at AS "orderDate",
          o.id::text AS "orderNumber",
          COALESCE(addr.full_name, u.name, 'Customer') AS customer
       FROM gst_invoices gi
       JOIN orders o ON o.id = gi.order_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN LATERAL (
          SELECT a.full_name
          FROM order_items oi
          JOIN addresses a ON a.id = oi.delivery_address_id
          WHERE oi.order_id = o.id
          ORDER BY oi.created_at ASC
          LIMIT 1
       ) addr ON true
       WHERE o.created_at >= $1::timestamptz
         AND o.created_at <= $2::timestamptz
       ORDER BY o.created_at DESC`,
      [filters.dateFrom, filters.dateTo]
    );

    return res.rows.map((row) => ({
      ...row,
      totalAmount: Number(row.totalAmount),
      gstAmount: Number(row.gstAmount),
    }));
  }

  async getPendingActionsDashboard() {
    const awaitingShiprocketOrdersRes = await this.query(
      `SELECT
          o.id,
          o.id::text AS "orderNumber",
          COALESCE(addr.full_name, u.name, 'Customer') AS customer,
          o.total_amount AS total,
          o.created_at AS "createdAt"
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN LATERAL (
          SELECT a.full_name
          FROM order_items oi
          JOIN addresses a ON a.id = oi.delivery_address_id
          WHERE oi.order_id = o.id
          ORDER BY oi.created_at ASC
          LIMIT 1
       ) addr ON true
       WHERE o.status = 'CONFIRMED'
         AND o.shiprocket_order_id IS NULL
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    const codPendingOrdersRes = await this.query(
      `SELECT
          o.id,
          o.id::text AS "orderNumber",
          COALESCE(addr.full_name, u.name, 'Customer') AS customer,
          o.total_amount AS total,
          COALESCE(addr.mobile, o.guest_mobile, u.mobile) AS mobile
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN LATERAL (
          SELECT a.full_name, a.mobile
          FROM order_items oi
          JOIN addresses a ON a.id = oi.delivery_address_id
          WHERE oi.order_id = o.id
          ORDER BY oi.created_at ASC
          LIMIT 1
       ) addr ON true
       WHERE o.payment_method = 'COD'
         AND o.status = 'PAYMENT_PENDING'
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    const failedPaymentsRes = await this.query(
      `SELECT COUNT(*)::integer AS count
       FROM payments
       WHERE status = 'FAILED'
         AND created_at >= now() - interval '24 hours'`
    );

    const openReturnsRes = await this.query(
      `SELECT COUNT(*)::integer AS count
       FROM return_requests
       WHERE is_deleted = false
         AND status NOT IN ('COMPLETED', 'REJECTED')`
    );

    return {
      awaitingShiprocket: awaitingShiprocketOrdersRes.rows.length,
      awaitingShiprocketOrders: awaitingShiprocketOrdersRes.rows.map((row) => ({
        ...row,
        total: Number(row.total),
      })),
      codPendingConfirmation: codPendingOrdersRes.rows.length,
      codPendingOrders: codPendingOrdersRes.rows.map((row) => ({
        ...row,
        total: Number(row.total),
      })),
      failedPayments24h: Number(failedPaymentsRes.rows[0]?.count || 0),
      openReturns: Number(openReturnsRes.rows[0]?.count || 0),
    };
  }
}
