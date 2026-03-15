import axios from 'axios';
import { getDbPool, getRedisClient, AppError, ErrorCode, logger } from '@fs/shared';
import { randomUUID } from 'crypto';

type PaymentStatus = 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
type RefundLookupStatus = 'pending' | 'processed' | 'failed' | 'unknown';

interface OrderContext {
  id: string;
  userId: string | null;
  status: string;
  paymentMethod: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  guestName: string;
  guestMobile: string | null;
  guestEmail: string | null;
  guestAddress: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderItemContext {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  deliveryAddressId: string;
  sku: string | null;
  size: string | null;
  colour: string | null;
  productName: string | null;
  fabricType: string | null;
}

interface RefundStatusPayload {
  razorpayRefundId: string;
  amount: number;
  status: RefundLookupStatus;
  initiatedAt: string;
  processedAt: string | null;
  expectedCreditDays: number;
  bankReferenceNumber: string | null;
  error?: string;
}

interface PaymentRecord {
  id: string;
  orderId: string;
  userId: string;
  razorpayPaymentId: string | null;
  status: PaymentStatus;
  amount: number;
  refundId: string | null;
  refundAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const RAZORPAY_API_URL = process.env.RAZORPAY_API_URL || 'https://api.razorpay.com/v1';
const REFUND_STATUS_CACHE_TTL_SECONDS = 60 * 5;

const mapRefundStatus = (rawStatus: unknown): RefundLookupStatus => {
  const normalized = String(rawStatus || '').toLowerCase();

  if (normalized === 'processed') return 'processed';
  if (normalized === 'failed') return 'failed';
  if (normalized === 'pending') return 'pending';
  return 'unknown';
};

export class InternalService {
  private db = getDbPool();

  async getOrder(orderId: string, userId?: string | null): Promise<OrderContext> {
    const { rows } = await this.db.query(
      `SELECT
          o.id,
          o.user_id AS "userId",
          o.status,
          o.payment_method AS "paymentMethod",
          o.subtotal,
          o.gst_amount AS "gstAmount",
          o.total_amount AS "totalAmount",
          COALESCE(addr.full_name, u.name, 'Customer') AS "guestName",
          COALESCE(addr.mobile, o.guest_mobile, u.mobile) AS "guestMobile",
          u.email AS "guestEmail",
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(', ', addr.line1, addr.line2, addr.city, addr.state, addr.pincode)), ''),
            o.guest_address
          ) AS "guestAddress",
          delivered_event.created_at AS "deliveredAt",
          o.created_at AS "createdAt",
          o.updated_at AS "updatedAt"
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
       LEFT JOIN LATERAL (
          SELECT created_at
          FROM order_status_history
          WHERE order_id = o.id AND status = 'DELIVERED'
          ORDER BY created_at DESC
          LIMIT 1
       ) delivered_event ON true
       WHERE o.id = $1
         AND ($2::uuid IS NULL OR o.user_id = $2::uuid)`,
      [orderId, userId || null]
    );

    if (!rows.length) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Order not found');
    }

    return rows[0] as OrderContext;
  }

  async getOrderItems(orderId: string): Promise<OrderItemContext[]> {
    const { rows } = await this.db.query(
      `SELECT
          oi.id,
          oi.order_id AS "orderId",
          oi.product_id AS "productId",
          oi.variant_id AS "variantId",
          oi.quantity,
          oi.unit_price AS "unitPrice",
          oi.gst_rate AS "gstRate",
          oi.gst_amount AS "gstAmount",
          oi.delivery_address_id AS "deliveryAddressId",
          v.sku,
          v.size,
          v.colour,
          p.name AS "productName",
          p.fabric_type AS "fabricType"
       FROM order_items oi
       JOIN variants v ON v.id = oi.variant_id
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [orderId]
    );

    return rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      gstRate: Number(row.gstRate),
      gstAmount: Number(row.gstAmount),
    })) as OrderItemContext[];
  }

  async initiateRefund(orderId: string, amount: number, returnId?: string): Promise<RefundStatusPayload> {
    const payment = await this.getPaymentByOrderId(orderId);

    if (!payment) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Payment record not found for this order');
    }

    if (payment.status !== 'CAPTURED' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Payment is not refundable');
    }

    if (!payment.razorpayPaymentId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Razorpay payment id is missing for this order');
    }

    const credentials = this.getRazorpayCredentials();

    if (!credentials) {
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Razorpay credentials are not configured');
    }

    const refundAmount = Math.round(amount * 100);

    try {
      const response = await axios.post(
        `${RAZORPAY_API_URL}/payments/${payment.razorpayPaymentId}/refund`,
        { amount: refundAmount, speed: 'normal' },
        {
          auth: {
            username: credentials.keyId,
            password: credentials.keySecret,
          },
          timeout: 10000,
        }
      );

      const providerRefund = response.data as Record<string, any>;
      const nextStatus: PaymentStatus =
        amount < payment.amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

      await this.db.query(
        `UPDATE payments
         SET status = $2,
             refund_id = $3,
             refund_amount = $4,
             updated_at = now()
         WHERE id = $1`,
        [payment.id, nextStatus, String(providerRefund.id), amount]
      );

      const refundStatus: RefundStatusPayload = {
        razorpayRefundId: String(providerRefund.id),
        amount,
        status: mapRefundStatus(providerRefund.status),
        initiatedAt: providerRefund.created_at
          ? new Date(Number(providerRefund.created_at) * 1000).toISOString()
          : new Date().toISOString(),
        processedAt: providerRefund.processed_at
          ? new Date(Number(providerRefund.processed_at) * 1000).toISOString()
          : null,
        expectedCreditDays: 5,
        bankReferenceNumber:
          providerRefund.acquirer_data?.arn ||
          providerRefund.acquirer_data?.bank_reference ||
          null,
      };

      if (returnId) {
        await this.cacheRefundStatus(returnId, refundStatus);
      }
      return refundStatus;
    } catch (error: any) {
      logger.error(`Error initiating refund for order ${orderId}: ${error.message}`);
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Failed to initiate refund');
    }
  }

  async getRefundStatus(returnId: string, orderId: string): Promise<RefundStatusPayload | null> {
    const cached = await this.getCachedRefundStatus(returnId);
    if (cached) {
      return cached;
    }

    const payment = await this.getPaymentByOrderId(orderId);

    if (!payment?.refundId) {
      return null;
    }

    const credentials = this.getRazorpayCredentials();
    if (!credentials) {
      return this.buildRefundFallback(payment, 'Unable to fetch from Razorpay');
    }

    try {
      const response = await axios.get(`${RAZORPAY_API_URL}/refunds/${payment.refundId}`, {
        auth: {
          username: credentials.keyId,
          password: credentials.keySecret,
        },
        timeout: 10000,
      });

      const providerRefund = response.data as Record<string, any>;
      const refundStatus: RefundStatusPayload = {
        razorpayRefundId: String(providerRefund.id || payment.refundId),
        amount: payment.refundAmount ?? payment.amount,
        status: mapRefundStatus(providerRefund.status),
        initiatedAt: providerRefund.created_at
          ? new Date(Number(providerRefund.created_at) * 1000).toISOString()
          : payment.updatedAt.toISOString(),
        processedAt: providerRefund.processed_at
          ? new Date(Number(providerRefund.processed_at) * 1000).toISOString()
          : null,
        expectedCreditDays: 5,
        bankReferenceNumber:
          providerRefund.acquirer_data?.arn ||
          providerRefund.acquirer_data?.bank_reference ||
          null,
      };

      await this.cacheRefundStatus(returnId, refundStatus);
      return refundStatus;
    } catch (error: any) {
      logger.warn(`Refund status lookup failed for return ${returnId}: ${error.message}`);
      return this.buildRefundFallback(payment, 'Unable to fetch from Razorpay');
    }
  }

  async createReplacementOrder(originalOrderId: string, items: Array<{ orderItemId: string; quantity: number }>, returnId?: string): Promise<{ id: string }> {
    const originalOrder = await this.getOrder(originalOrderId, null);
    const originalItems = await this.getOrderItems(originalOrderId);
    const originalItemsMap = new Map(originalItems.map((item) => [item.id, item]));

    return this.withTransaction(async (client) => {
      const replacementOrderResult = await client.query(
        `INSERT INTO orders
          (user_id, status, payment_method, subtotal, discount_amount, gst_amount, total_amount, replacement_of, notes, guest_mobile, guest_address)
         VALUES ($1, 'CONFIRMED', $2, 0, 0, 0, 0, $3, $4, $5, $6)
         RETURNING id`,
        [
          originalOrder.userId,
          originalOrder.paymentMethod,
          originalOrderId,
          returnId ? `Replacement order for return ${returnId}` : `Replacement order for ${originalOrderId}`,
          originalOrder.guestMobile,
          originalOrder.guestAddress,
        ]
      );

      const replacementOrderId = String(replacementOrderResult.rows[0].id);

      for (const item of items) {
        const originalItem = originalItemsMap.get(item.orderItemId);

        if (!originalItem) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, `Order item ${item.orderItemId} not found`);
        }

        const variantResult = await client.query(
          `SELECT qty FROM variants WHERE id = $1 FOR UPDATE`,
          [originalItem.variantId]
        );

        const availableQty = Number(variantResult.rows[0]?.qty ?? 0);
        if (availableQty < item.quantity) {
          throw new AppError(
            ErrorCode.STOCK_UNAVAILABLE,
            `Insufficient stock for replacement item ${originalItem.variantId}`
          );
        }

        await client.query(
          `UPDATE variants
           SET qty = qty - $2, version = version + 1
           WHERE id = $1`,
          [originalItem.variantId, item.quantity]
        );

        await client.query(
          `INSERT INTO order_items
            (order_id, variant_id, product_id, quantity, unit_price, gst_rate, gst_amount, delivery_address_id)
           VALUES ($1, $2, $3, $4, 0, 0, 0, $5)`,
          [
            replacementOrderId,
            originalItem.variantId,
            originalItem.productId,
            item.quantity,
            originalItem.deliveryAddressId,
          ]
        );
      }

      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes, created_by)
         VALUES ($1, 'CONFIRMED', $2, NULL)`,
        [
          replacementOrderId,
          returnId
            ? `Replacement order created for return ${returnId}`
            : `Replacement order created for order ${originalOrderId}`,
        ]
      );

      return { id: replacementOrderId };
    });
  }

  private async withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const { rows } = await this.db.query(
      `SELECT
          id,
          order_id AS "orderId",
          user_id AS "userId",
          razorpay_payment_id AS "razorpayPaymentId",
          status,
          amount,
          refund_id AS "refundId",
          refund_amount AS "refundAmount",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
       FROM payments
       WHERE order_id = $1`,
      [orderId]
    );

    if (!rows.length) {
      return null;
    }

    const payment = rows[0] as Record<string, any>;
    return {
      id: String(payment.id),
      orderId: String(payment.orderId),
      userId: String(payment.userId),
      razorpayPaymentId: payment.razorpayPaymentId ? String(payment.razorpayPaymentId) : null,
      status: String(payment.status) as PaymentStatus,
      amount: Number(payment.amount),
      refundId: payment.refundId ? String(payment.refundId) : null,
      refundAmount: payment.refundAmount === null ? null : Number(payment.refundAmount),
      createdAt: new Date(payment.createdAt),
      updatedAt: new Date(payment.updatedAt),
    };
  }

  private getRazorpayCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return null;
    }

    return { keyId, keySecret };
  }

  private async getCachedRefundStatus(returnId: string): Promise<RefundStatusPayload | null> {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(`refund_status:${returnId}`);
      return cached ? JSON.parse(cached) as RefundStatusPayload : null;
    } catch (error) {
      logger.warn(`Redis refund cache lookup failed for ${returnId}`);
      return null;
    }
  }

  private async cacheRefundStatus(returnId: string, payload: RefundStatusPayload): Promise<void> {
    const cacheKey = `refund_status:${returnId}`;
    try {
      const redis = getRedisClient();
      await redis.set(cacheKey, JSON.stringify(payload), 'EX', REFUND_STATUS_CACHE_TTL_SECONDS);
    } catch (error) {
      logger.warn(`Redis refund cache write failed for ${cacheKey}`);
    }
  }

  private buildRefundFallback(payment: PaymentRecord, errorMessage: string): RefundStatusPayload {
    return {
      razorpayRefundId: payment.refundId || `unknown_${randomUUID()}`,
      amount: payment.refundAmount ?? payment.amount,
      status: 'unknown',
      initiatedAt: payment.updatedAt.toISOString(),
      processedAt: null,
      expectedCreditDays: 5,
      bankReferenceNumber: null,
      error: errorMessage,
    };
  }
}
