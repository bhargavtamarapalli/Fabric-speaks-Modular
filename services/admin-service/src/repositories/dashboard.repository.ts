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

export interface CouponUsageRow {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  usedCount: number;
  usersCount: number;
  revenue: number;
}

export interface ReturnRateRow {
  productId: string;
  productName: string;
  orderedQty: number;
  returnedQty: number;
  returnRate: number;
}

export interface SalePerformance {
  orders: number;
  unitsSold: number;
  revenue: number;
  avgOrderValue: number;
}

export interface LiveSaleMonitor {
  orders: number;
  revenue: number;
  avgOrderValue: number;
  windowMinutes: number;
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
    const latencyQuery = `
      SELECT 
        COALESCE(AVG(CAST(metadata_json->>'latency_ms' AS INTEGER)), 0) as avg_latency,
        COUNT(DISTINCT session_id) as active_sessions
      FROM event_log
      WHERE created_at >= now() - interval '1 hour'
    `;
    const notificationQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM notification_log
      WHERE sent_at >= now() - interval '1 hour'
    `;

    const [latencyRes, notifRes] = await Promise.all([
      this.query(latencyQuery),
      this.query(notificationQuery)
    ]);

    const avgLatency = parseFloat(latencyRes.rows[0].avg_latency);
    const activeSessions = parseInt(latencyRes.rows[0].active_sessions);
    const total = parseInt(notifRes.rows[0]?.total ?? '0', 10);
    const failed = parseInt(notifRes.rows[0]?.failed ?? '0', 10);
    const errorRate = total === 0 ? 0 : Number((failed / total).toFixed(4));

    return {
      avgLatency,
      activeSessions,
      errorRate
    };
  }

  async getShiprocketIssues(hours: number = 6): Promise<number> {
    const ordersQuery = `
      SELECT COUNT(*)::integer as count
      FROM orders
      WHERE status IN ('CONFIRMED', 'PACKED', 'SHIPPED')
        AND shiprocket_order_id IS NULL
        AND created_at <= now() - interval '1 hour' * $1
    `;
    const returnsQuery = `
      SELECT COUNT(*)::integer as count
      FROM return_requests
      WHERE status = 'APPROVED'
        AND shiprocket_return_id IS NULL
        AND created_at <= now() - interval '1 hour' * $1
    `;

    const [ordersRes, returnsRes] = await Promise.all([
      this.query(ordersQuery, [hours]),
      this.query(returnsQuery, [hours])
    ]);

    return (ordersRes.rows[0]?.count ?? 0) + (returnsRes.rows[0]?.count ?? 0);
  }

  async getCouponUsage(limit: number = 50, offset: number = 0): Promise<CouponUsageRow[]> {
    const query = `
      SELECT
        c.id,
        c.code,
        c.discount_type as "discountType",
        c.discount_value as "discountValue",
        COUNT(o.id) as "usedCount",
        COUNT(DISTINCT o.user_id) as "usersCount",
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM coupons c
      LEFT JOIN orders o ON o.coupon_id = c.id
      GROUP BY c.id
      ORDER BY "usedCount" DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await this.query(query, [limit, offset]);
    return rows.map(row => ({
      id: String(row.id),
      code: row.code,
      discountType: row.discountType,
      discountValue: Number(row.discountValue),
      usedCount: parseInt(row.usedCount, 10),
      usersCount: parseInt(row.usersCount, 10),
      revenue: Number(row.revenue)
    }));
  }

  async getReturnRateByProduct(limit: number = 50, offset: number = 0): Promise<ReturnRateRow[]> {
    const query = `
      WITH ordered AS (
        SELECT product_id, SUM(quantity) as ordered_qty
        FROM order_items
        GROUP BY product_id
      ),
      returned AS (
        SELECT oi.product_id, SUM(ri.quantity) as returned_qty
        FROM return_items ri
        JOIN return_requests rr ON rr.id = ri.return_request_id
        JOIN order_items oi ON oi.id = ri.order_item_id
        WHERE rr.is_deleted = false
        GROUP BY oi.product_id
      )
      SELECT
        p.id as "productId",
        p.name as "productName",
        COALESCE(o.ordered_qty, 0) as "orderedQty",
        COALESCE(r.returned_qty, 0) as "returnedQty",
        CASE
          WHEN COALESCE(o.ordered_qty, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(r.returned_qty, 0)::decimal / o.ordered_qty) * 100, 2)
        END as "returnRate"
      FROM products p
      LEFT JOIN ordered o ON o.product_id = p.id
      LEFT JOIN returned r ON r.product_id = p.id
      WHERE p.is_deleted = false
      ORDER BY "returnRate" DESC, "orderedQty" DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await this.query(query, [limit, offset]);
    return rows.map(row => ({
      productId: String(row.productId),
      productName: row.productName,
      orderedQty: Number(row.orderedQty),
      returnedQty: Number(row.returnedQty),
      returnRate: Number(row.returnRate)
    }));
  }

  async getSalePerformance(
    startsAt: Date,
    endsAt: Date,
    scope?: { type: 'fabric_type' | 'product_type' | 'collection'; ids: string[] },
    params: unknown[] = []
  ): Promise<SalePerformance> {
    // Build safe joins and filters based on scope type
    let joins = '';
    let filters = '';

    if (scope && scope.ids.length > 0) {
      const placeholders = scope.ids.map((_, i) => `$${i + 3}`).join(', ');
      params = [...scope.ids];

      switch (scope.type) {
        case 'fabric_type':
          filters = `AND p.fabric_type IN (${placeholders})`;
          break;
        case 'product_type':
          filters = `AND p.product_type IN (${placeholders})`;
          break;
        case 'collection':
          joins = 'JOIN collection_products cp ON cp.product_id = p.id';
          filters = `AND cp.collection_id IN (${placeholders})`;
          break;
      }
    }

    const query = `
      SELECT
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      ${joins}
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND p.is_deleted = false
        AND p.is_active = true
        ${filters}
    `;
    const { rows } = await this.query(query, [startsAt, endsAt, ...params]);
    const orders = parseInt(rows[0]?.orders ?? 0, 10);
    const revenue = Number(rows[0]?.revenue ?? 0);
    return {
      orders,
      unitsSold: Number(rows[0]?.units_sold ?? 0),
      revenue,
      avgOrderValue: orders === 0 ? 0 : Number((revenue / orders).toFixed(2))
    };
  }

  async getLiveSaleMonitor(
    windowMinutes: number = 30,
    scope?: { type: 'fabric_type' | 'product_type' | 'collection'; ids: string[] },
    saleOnly: boolean = false
  ): Promise<LiveSaleMonitor> {
    // Build safe joins and filters based on scope type
    let joins = '';
    let filters = '';
    const params: unknown[] = [windowMinutes];

    if (scope && scope.ids.length > 0) {
      const placeholders = scope.ids.map((_, i) => `$${i + 2}`).join(', ');
      params.push(...scope.ids);

      switch (scope.type) {
        case 'fabric_type':
          filters = `AND p.fabric_type IN (${placeholders})`;
          break;
        case 'product_type':
          filters = `AND p.product_type IN (${placeholders})`;
          break;
        case 'collection':
          joins = 'JOIN collection_products cp ON cp.product_id = p.id';
          filters = `AND cp.collection_id IN (${placeholders})`;
          break;
      }
    }

    const saleFilter = saleOnly ? 'AND v.sale_active = true' : '';
    const query = `
      SELECT
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      JOIN variants v ON v.id = oi.variant_id
      ${joins}
      WHERE o.created_at >= now() - interval '1 minute' * $1
        AND p.is_deleted = false
        AND p.is_active = true
        ${saleFilter}
        ${filters}
    `;
    const { rows } = await this.query(query, params);
    const orders = parseInt(rows[0]?.orders ?? 0, 10);
    const revenue = Number(rows[0]?.revenue ?? 0);
    return {
      orders,
      revenue,
      avgOrderValue: orders === 0 ? 0 : Number((revenue / orders).toFixed(2)),
      windowMinutes
    };
  }
}
