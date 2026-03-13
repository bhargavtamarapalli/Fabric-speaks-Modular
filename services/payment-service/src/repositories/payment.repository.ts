import { BaseRepository } from '@fs/shared';

export interface PaymentRecord {
    id: string;
    orderId: string;
    userId: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
    amount: number;
    currency: string;
    method?: string;
    errorMessage?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class PaymentRepository extends BaseRepository {
  async createPayment(paymentData: {
    orderId: string;
    userId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    status: string;
  }) {
    const res = await this.query(`
      INSERT INTO payments (order_id, user_id, razorpay_order_id, amount, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      paymentData.orderId,
      paymentData.userId,
      paymentData.razorpayOrderId,
      paymentData.amount,
      paymentData.currency,
      paymentData.status
    ]);
    return this.mapToCamelCase<PaymentRecord>(res.rows[0]);
  }

  async updatePayment(razorpayOrderId: string, updateData: {
    razorpayPaymentId?: string;
    status: string;
    methodHint?: string;
    failureReason?: string;
    refundId?: string;
    refundAmount?: number;
  }) {
    const res = await this.query(`
      UPDATE payments 
      SET 
        razorpay_payment_id = COALESCE($1, razorpay_payment_id),
        status = $2,
        method_hint = COALESCE($3, method_hint),
        failure_reason = COALESCE($4, failure_reason),
        refund_id = COALESCE($5, refund_id),
        refund_amount = COALESCE($6, refund_amount),
        updated_at = now()
      WHERE razorpay_order_id = $7
      RETURNING *
    `, [
      updateData.razorpayPaymentId,
      updateData.status,
      updateData.methodHint,
      updateData.failureReason,
      updateData.refundId,
      updateData.refundAmount,
      razorpayOrderId
    ]);
    return this.mapToCamelCase<PaymentRecord>(res.rows[0]);
  }

  async getPaymentByRazorpayOrderId(razorpayOrderId: string) {
    const res = await this.query(`
      SELECT * FROM payments WHERE razorpay_order_id = $1
    `, [razorpayOrderId]);
    return res.rows[0] ? this.mapToCamelCase<PaymentRecord>(res.rows[0]) : null;
  }

  async getPaymentByOrderId(orderId: string) {
    const res = await this.query(`
      SELECT * FROM payments WHERE order_id = $1
    `, [orderId]);
    return res.rows[0] || null;
  }

  async getOrderTotal(orderId: string) {
    const res = await this.query(`
      SELECT total_amount FROM orders WHERE id = $1
    `, [orderId]);
    return res.rows[0] ? Number(res.rows[0].total_amount) : null;
  }
}
