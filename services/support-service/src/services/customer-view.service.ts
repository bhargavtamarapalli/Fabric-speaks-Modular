import { query } from '@fs/shared/db';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { maskMobile } from '@fs/shared/logger';

export class CustomerViewService {
  /**
   * SUP-04: Constructs a 360-degree view without mutating anything.
   * Matches mobile explicitly and aggregates lifetime metrics.
   * Enforces RULE 1 (uses server total amounts) and RULE 5 (masking).
   */
  static async getCustomer360ByMobile(mobile: string) {
    const { rows: users } = await query(`
      SELECT id, name, mobile, is_wa_opted_in "isWaOptedIn", created_at as "joinedAt"
      FROM users WHERE mobile = $1 OR mobile LIKE '%' || $1
      LIMIT 1
    `, [mobile.slice(-10)]); // Allow 10-digit match

    if (!users.length) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Customer not found by mobile');
    }

    const user = users[0];
    user.mobile = maskMobile(user.mobile); // RULE 5 compliance

    const [ordersRes, returnsRes] = await Promise.all([
      query(`
        SELECT id, display_id as "displayId", status, total_amount as "totalAmount", 
               payment_method as "paymentMethod", payment_status as "paymentStatus", created_at "createdAt"
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `, [user.id]),
      query(`
        SELECT id, order_id as "orderId", status, refund_amount "refundAmount", created_at "createdAt"
        FROM returns
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [user.id])
    ]);

    // Aggregate lifetime value
    const lifetimeValue = ordersRes.rows
      .filter(o => o.status === 'DELIVERED')
      // RULE 1: total_amount natively fetched from the DB order record, zero client trust
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    return {
      customer: user,
      metrics: {
        totalOrders: ordersRes.rows.length,
        totalReturns: returnsRes.rows.length,
        lifetimeValue
      },
      recentOrders: ordersRes.rows,
      recentReturns: returnsRes.rows
    };
  }

  static async getOrderHistorySnippet(orderId: string) {
    const { rows } = await query(`
      SELECT display_id as "displayId", status, total_amount as "totalAmount", created_at "createdAt"
      FROM orders WHERE id = $1
    `, [orderId]);
    return rows[0] || null;
  }
}
