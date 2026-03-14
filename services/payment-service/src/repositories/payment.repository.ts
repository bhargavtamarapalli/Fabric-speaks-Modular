import { BaseRepository } from '@fs/shared';
import { PaymentStatus } from '../constants/payment.constants';

export interface PaymentRecord {
  id: string;
  orderId: string;
  userId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  methodHint: string | null;
  failureReason: string | null;
  refundId: string | null;
  refundAmount: number | null;
  cardLast4: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderPaymentContext {
  orderId: string;
  userId: string;
  totalAmount: number;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'COD';
  isCodConfirmed: boolean;
}

export interface CreatePaymentInput {
  orderId: string;
  userId: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  methodHint?: string | null;
  failureReason?: string | null;
  refundId?: string | null;
  refundAmount?: number | null;
  cardLast4?: string | null;
}

export interface UpdatePaymentInput {
  razorpayPaymentId?: string | null;
  status: PaymentStatus;
  methodHint?: string | null;
  failureReason?: string | null;
  refundId?: string | null;
  refundAmount?: number | null;
  cardLast4?: string | null;
}

const mapPaymentRecord = (row: Record<string, unknown>): PaymentRecord => {
  const payment = row as Record<string, string | number | null | Date>;

  return {
    id: String(payment.id),
    orderId: String(payment.order_id),
    userId: String(payment.user_id),
    razorpayOrderId: payment.razorpay_order_id ? String(payment.razorpay_order_id) : null,
    razorpayPaymentId: payment.razorpay_payment_id ? String(payment.razorpay_payment_id) : null,
    status: String(payment.status) as PaymentStatus,
    amount: Number(payment.amount),
    currency: String(payment.currency),
    methodHint: payment.method_hint ? String(payment.method_hint) : null,
    failureReason: payment.failure_reason ? String(payment.failure_reason) : null,
    refundId: payment.refund_id ? String(payment.refund_id) : null,
    refundAmount: payment.refund_amount === null ? null : Number(payment.refund_amount),
    cardLast4: payment.card_last4 ? String(payment.card_last4) : null,
    createdAt: payment.created_at as Date,
    updatedAt: payment.updated_at as Date,
  };
};

const mapOrderPaymentContext = (row: Record<string, unknown>): OrderPaymentContext => {
  const order = row as Record<string, string | number | boolean>;

  return {
    orderId: String(order.order_id),
    userId: String(order.user_id),
    totalAmount: Number(order.total_amount),
    paymentMethod: String(order.payment_method) as OrderPaymentContext['paymentMethod'],
    isCodConfirmed: Boolean(order.is_cod_confirmed),
  };
};

export class PaymentRepository extends BaseRepository {
  async createPayment(paymentData: CreatePaymentInput): Promise<PaymentRecord> {
    const result = await this.query(
      `
        INSERT INTO payments (
          order_id,
          user_id,
          razorpay_order_id,
          razorpay_payment_id,
          amount,
          currency,
          status,
          method_hint,
          failure_reason,
          refund_id,
          refund_amount,
          card_last4
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        paymentData.orderId,
        paymentData.userId,
        paymentData.razorpayOrderId ?? null,
        paymentData.razorpayPaymentId ?? null,
        paymentData.amount,
        paymentData.currency,
        paymentData.status,
        paymentData.methodHint ?? null,
        paymentData.failureReason ?? null,
        paymentData.refundId ?? null,
        paymentData.refundAmount ?? null,
        paymentData.cardLast4 ?? null,
      ]
    );

    return mapPaymentRecord(result.rows[0] as Record<string, unknown>);
  }

  async updatePayment(razorpayOrderId: string, updateData: UpdatePaymentInput): Promise<PaymentRecord | null> {
    const result = await this.query(
      `
        UPDATE payments
        SET
          razorpay_payment_id = COALESCE($1, razorpay_payment_id),
          status = $2,
          method_hint = COALESCE($3, method_hint),
          failure_reason = COALESCE($4, failure_reason),
          refund_id = COALESCE($5, refund_id),
          refund_amount = COALESCE($6, refund_amount),
          card_last4 = COALESCE($7, card_last4),
          updated_at = now()
        WHERE razorpay_order_id = $8
        RETURNING *
      `,
      [
        updateData.razorpayPaymentId ?? null,
        updateData.status,
        updateData.methodHint ?? null,
        updateData.failureReason ?? null,
        updateData.refundId ?? null,
        updateData.refundAmount ?? null,
        updateData.cardLast4 ?? null,
        razorpayOrderId,
      ]
    );

    return result.rows[0] ? mapPaymentRecord(result.rows[0] as Record<string, unknown>) : null;
  }

  async updatePaymentByOrderId(orderId: string, updateData: UpdatePaymentInput): Promise<PaymentRecord | null> {
    const result = await this.query(
      `
        UPDATE payments
        SET
          razorpay_payment_id = COALESCE($1, razorpay_payment_id),
          status = $2,
          method_hint = COALESCE($3, method_hint),
          failure_reason = COALESCE($4, failure_reason),
          refund_id = COALESCE($5, refund_id),
          refund_amount = COALESCE($6, refund_amount),
          card_last4 = COALESCE($7, card_last4),
          updated_at = now()
        WHERE order_id = $8
        RETURNING *
      `,
      [
        updateData.razorpayPaymentId ?? null,
        updateData.status,
        updateData.methodHint ?? null,
        updateData.failureReason ?? null,
        updateData.refundId ?? null,
        updateData.refundAmount ?? null,
        updateData.cardLast4 ?? null,
        orderId,
      ]
    );

    return result.rows[0] ? mapPaymentRecord(result.rows[0] as Record<string, unknown>) : null;
  }

  async getPaymentByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentRecord | null> {
    const result = await this.query('SELECT * FROM payments WHERE razorpay_order_id = $1', [razorpayOrderId]);
    return result.rows[0] ? mapPaymentRecord(result.rows[0] as Record<string, unknown>) : null;
  }

  async getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const result = await this.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
    return result.rows[0] ? mapPaymentRecord(result.rows[0] as Record<string, unknown>) : null;
  }

  async getPaymentByOrderIdForUser(orderId: string, userId: string): Promise<PaymentRecord | null> {
    const result = await this.query('SELECT * FROM payments WHERE order_id = $1 AND user_id = $2', [orderId, userId]);
    return result.rows[0] ? mapPaymentRecord(result.rows[0] as Record<string, unknown>) : null;
  }

  async getOrderPaymentContext(orderId: string): Promise<OrderPaymentContext | null> {
    const result = await this.query(
      `
        SELECT
          id AS order_id,
          user_id,
          total_amount,
          payment_method,
          is_cod_confirmed
        FROM orders
        WHERE id = $1
      `,
      [orderId]
    );

    return result.rows[0] ? mapOrderPaymentContext(result.rows[0] as Record<string, unknown>) : null;
  }

  async getOrderPaymentContextForUser(orderId: string, userId: string): Promise<OrderPaymentContext | null> {
    const result = await this.query(
      `
        SELECT
          id AS order_id,
          user_id,
          total_amount,
          payment_method,
          is_cod_confirmed
        FROM orders
        WHERE id = $1 AND user_id = $2
      `,
      [orderId, userId]
    );

    return result.rows[0] ? mapOrderPaymentContext(result.rows[0] as Record<string, unknown>) : null;
  }

  async markCodConfirmed(orderId: string, userId: string): Promise<OrderPaymentContext | null> {
    const result = await this.query(
      `
        UPDATE orders
        SET
          is_cod_confirmed = true,
          updated_at = now()
        WHERE id = $1
          AND user_id = $2
          AND payment_method = 'COD'
          AND is_cod_confirmed = false
        RETURNING
          id AS order_id,
          user_id,
          total_amount,
          payment_method,
          is_cod_confirmed
      `,
      [orderId, userId]
    );

    return result.rows[0] ? mapOrderPaymentContext(result.rows[0] as Record<string, unknown>) : null;
  }
}
