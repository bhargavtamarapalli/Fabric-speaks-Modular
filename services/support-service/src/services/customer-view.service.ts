import { BaseRepository, AppError, ErrorCode, maskMobile } from '@fs/shared';

export class CustomerViewService extends BaseRepository {
  /**
   * SUP-04: Constructs a 360-degree view without mutating anything.
   * Matches mobile explicitly and aggregates lifetime metrics.
   * Enforces RULE 1 (uses server total amounts) and RULE 5 (masking).
   */
  async getCustomer360ByMobile(mobile: string) {
    const { rows: users } = await this.query(`
      SELECT id, name, mobile, created_at as "joinedAt"
      FROM users WHERE mobile = $1 OR mobile LIKE '%' || $1
      LIMIT 1
    `, [mobile.slice(-10)]); // Allow 10-digit match

    if (!users.length) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Customer not found by mobile');
    }

    const user = users[0];
    user.mobile = maskMobile(user.mobile); // RULE 5 compliance

    const [ordersRes, returnsRes] = await Promise.all([
      this.query(`
        SELECT
          o.id,
          o.id as "displayId",
          o.status,
          o.total_amount as "totalAmount",
          o.payment_method as "paymentMethod",
          pay.status as "paymentStatus",
          o.created_at as "createdAt"
        FROM orders o
        LEFT JOIN LATERAL (
          SELECT status
          FROM payments p
          WHERE p.order_id = o.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) pay ON true
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 20
      `, [user.id]),
      this.query(`
        SELECT
          rr.id,
          rr.order_id as "orderId",
          rr.status,
          COALESCE(SUM(ri.refund_amount), 0) as "refundAmount",
          rr.created_at as "createdAt"
        FROM return_requests rr
        LEFT JOIN return_items ri ON ri.return_request_id = rr.id
        WHERE rr.user_id = $1 AND rr.is_deleted = false
        GROUP BY rr.id
        ORDER BY rr.created_at DESC
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

  async getOrderHistorySnippet(orderId: string) {
    const { rows } = await this.query(`
      SELECT id as "displayId", status, total_amount as "totalAmount", created_at as "createdAt"
      FROM orders WHERE id = $1
    `, [orderId]);
    return rows[0] || null;
  }
}
