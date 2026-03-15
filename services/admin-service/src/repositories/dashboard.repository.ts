import { BaseRepository } from '@fs/shared';

export interface RevenueMetrics {
  totalRevenue: number;
  avgOrderValue: number;
  orderCount: number;
  revenueByStatus: Record<string, number>;
}

export interface OrderTrend {
  date: string;
  count: number;
  revenue: number;
}

export interface TopPerformer {
  name: string;
  volume: number;
  revenue: number;
}

export class DashboardRepository extends BaseRepository {
  async getRevenueMetrics(days: number = 30): Promise<RevenueMetrics> {
    const query = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_order_value,
        COUNT(*) as order_count,
        status
      FROM orders
      WHERE created_at >= now() - interval '1 day' * $1
      GROUP BY status
    `;
    const { rows } = await this.query(query, [days]);
    
    const metrics: RevenueMetrics = {
      totalRevenue: 0,
      avgOrderValue: 0,
      orderCount: 0,
      revenueByStatus: {}
    };

    rows.forEach(r => {
      metrics.totalRevenue += parseFloat(r.total_revenue);
      metrics.orderCount += parseInt(r.order_count);
      metrics.revenueByStatus[r.status] = parseFloat(r.total_revenue);
    });

    if (metrics.orderCount > 0) {
      metrics.avgOrderValue = metrics.totalRevenue / metrics.orderCount;
    }

    return metrics;
  }

  async getOrderTrends(days: number = 30): Promise<OrderTrend[]> {
    const query = `
      SELECT 
        date_trunc('day', created_at)::date as date,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE created_at >= now() - interval '1 day' * $1
      GROUP BY date
      ORDER BY date ASC
    `;
    const { rows } = await this.query(query, [days]);
    return rows.map(r => ({
      date: r.date.toISOString().split('T')[0],
      count: parseInt(r.count),
      revenue: parseFloat(r.revenue)
    }));
  }

  async getTopProducts(limit: number = 5): Promise<TopPerformer[]> {
    const query = `
      SELECT 
        p.name,
        SUM(oi.quantity) as volume,
        SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id, p.name
      ORDER BY volume DESC
      LIMIT $1
    `;
    const { rows } = await this.query(query, [limit]);
    return rows.map(r => ({
      name: r.name,
      volume: parseInt(r.volume),
      revenue: parseFloat(r.revenue)
    }));
  }

  async getFailedPaymentsCount(): Promise<number> {
    const { rows } = await this.query("SELECT COUNT(*) FROM orders WHERE status = 'PAYMENT_FAILED'");
    return parseInt(rows[0].count);
  }

  async getCODStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) filter (where is_cod_confirmed = false) as pending_confirmation,
        COUNT(*) filter (where cod_fraud_flag = true) as fraud_flagged
      FROM orders
      WHERE payment_method = 'COD'
    `;
    const { rows } = await this.query(query);
    return rows[0];
  }
}
