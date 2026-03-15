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

export interface PeriodComparison {
  currentOrders: number;
  previousOrders: number;
  ordersDeltaPct: number | null;
  currentRevenue: number;
  previousRevenue: number;
  revenueDeltaPct: number | null;
}

export interface ConversionFunnel {
  views: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
}

export interface SystemHealth {
  errorRate: number;
  avgLatency: number;
  activeSessions: number;
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

  async getTopFabrics(limit: number = 5): Promise<TopPerformer[]> {
    const query = `
      SELECT 
        COALESCE(p.attributes->>'fabric_type', 'unknown') as name,
        SUM(oi.quantity) as volume,
        SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      GROUP BY name
      ORDER BY volume DESC
      LIMIT $1
    `;
    const { rows } = await this.query(query, [limit]);
    return rows.map((row) => ({
      name: row.name,
      volume: parseInt(row.volume, 10),
      revenue: parseFloat(row.revenue)
    }));
  }

  async getPeriodComparison(days: number): Promise<PeriodComparison> {
    const query = `
      WITH current_period AS (
        SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= now() - interval '1 day' * $1
      ),
      previous_period AS (
        SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= now() - interval '1 day' * ($1 * 2)
          AND created_at < now() - interval '1 day' * $1
      )
      SELECT 
        (SELECT order_count FROM current_period) as current_orders,
        (SELECT revenue FROM current_period) as current_revenue,
        (SELECT order_count FROM previous_period) as previous_orders,
        (SELECT revenue FROM previous_period) as previous_revenue
    `;
    const { rows } = await this.query(query, [days]);
    const row = rows[0] || {};
    const currentOrders = parseInt(row.current_orders ?? 0, 10);
    const previousOrders = parseInt(row.previous_orders ?? 0, 10);
    const currentRevenue = parseFloat(row.current_revenue ?? 0);
    const previousRevenue = parseFloat(row.previous_revenue ?? 0);

    return {
      currentOrders,
      previousOrders,
      ordersDeltaPct: this.computeDeltaPct(currentOrders, previousOrders),
      currentRevenue,
      previousRevenue,
      revenueDeltaPct: this.computeDeltaPct(currentRevenue, previousRevenue)
    };
  }

  private computeDeltaPct(current: number, previous: number): number | null {
    if (previous === 0) {
      return current === 0 ? 0 : null;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
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

  async getConversionFunnel(days: number = 30): Promise<ConversionFunnel> {
    const query = `
      SELECT 
        COUNT(*) filter (where event_type = 'view_product') as views,
        COUNT(*) filter (where event_type = 'add_to_cart') as add_to_carts,
        COUNT(*) filter (where event_type = 'checkout_start') as checkouts,
        COUNT(*) filter (where event_type = 'purchase') as purchases
      FROM event_log
      WHERE created_at >= now() - interval '1 day' * $1
    `;
    const { rows } = await this.query(query, [days]);
    const r = rows[0];
    return {
      views: parseInt(r.views),
      addToCarts: parseInt(r.add_to_carts),
      checkouts: parseInt(r.checkouts),
      purchases: parseInt(r.purchases)
    };
  }

  async getAbandonedCartRate(): Promise<number> {
    const query = `
      WITH active_carts AS (
        SELECT COUNT(DISTINCT user_id) as count FROM cart_items
      ),
      recent_orders AS (
        SELECT COUNT(DISTINCT user_id) as count FROM orders WHERE created_at >= now() - interval '24 hours'
      )
      SELECT 
        CASE 
          WHEN (SELECT count FROM active_carts) = 0 THEN 0 
          ELSE (1.0 - (SELECT count::float FROM recent_orders) / (SELECT count::float FROM active_carts)) * 100
        END as rate
    `;
    const { rows } = await this.query(query);
    return parseFloat(rows[0].rate);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    // Simplified health check using event_log for latency and audit_log for error proxies
    const query = `
      SELECT 
        COALESCE(AVG(CAST(metadata_json->>'latency_ms' AS INTEGER)), 0) as avg_latency,
        COUNT(DISTINCT session_id) as active_sessions
      FROM event_log
      WHERE created_at >= now() - interval '1 hour'
    `;
    const { rows } = await this.query(query);
    
    // Proxy for errors: check audit logs for specific failure actions or just mock for now
    return {
      avgLatency: parseFloat(rows[0].avg_latency),
      activeSessions: parseInt(rows[0].active_sessions),
      errorRate: 0.02 // Placeholder 2% error rate proxy
    };
  }
}
