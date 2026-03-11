import { getDbPool } from '@fs/shared/src/db';

export class PaymentRepository {
  async createPayment(paymentData: {
    order_id: string;
    user_id: string;
    razorpay_order_id: string;
    amount: number;
    currency: string;
    status: string;
  }) {
    const res = await getDbPool().query(`
      INSERT INTO payments (order_id, user_id, razorpay_order_id, amount, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      paymentData.order_id,
      paymentData.user_id,
      paymentData.razorpay_order_id,
      paymentData.amount,
      paymentData.currency,
      paymentData.status
    ]);
    return res.rows[0];
  }

  async updatePayment(razorpayOrderId: string, updateData: {
    razorpay_payment_id?: string;
    status: string;
    method_hint?: string;
    failure_reason?: string;
    refund_id?: string;
    refund_amount?: number;
  }) {
    const res = await getDbPool().query(`
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
      updateData.razorpay_payment_id,
      updateData.status,
      updateData.method_hint,
      updateData.failure_reason,
      updateData.refund_id,
      updateData.refund_amount,
      razorpayOrderId
    ]);
    return res.rows[0];
  }

  async getPaymentByRazorpayOrderId(razorpayOrderId: string) {
    const res = await getDbPool().query(`
      SELECT * FROM payments WHERE razorpay_order_id = $1
    `, [razorpayOrderId]);
    return res.rows[0] || null;
  }

  async getPaymentByOrderId(orderId: string) {
    const res = await getDbPool().query(`
      SELECT * FROM payments WHERE order_id = $1
    `, [orderId]);
    return res.rows[0] || null;
  }

  async getOrderTotal(orderId: string) {
    const res = await getDbPool().query(`
      SELECT total_amount FROM orders WHERE id = $1
    `, [orderId]);
    return res.rows[0] ? Number(res.rows[0].total_amount) : null;
  }
}
