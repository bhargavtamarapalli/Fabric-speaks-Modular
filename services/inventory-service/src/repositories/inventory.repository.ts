import { BaseRepository } from '@fs/shared';

export interface VariantStock {
    variantId: string;
    sku: string;
    productName: string;
    stockQty: number;
    reservedQty: number;
    thresholdQty: number;
    healthStatus: string;
    avgDailySales?: number;
    daysRemaining?: number;
    size?: string | null;
    colour?: string | null;
}

export class InventoryRepository extends BaseRepository {
    async getAllVariants(sortBy: 'asc' | 'desc' = 'asc'): Promise<VariantStock[]> {
        const query = `
            SELECT 
                v.id as "variantId", 
                v.sku,
                v.size,
                v.colour,
                p.name as "productName", 
                v.qty as "stockQty",
                v.threshold_qty as "thresholdQty"
            FROM variants v
            JOIN products p ON v.product_id = p.id
            WHERE v.is_deleted = false
            ORDER BY v.qty ${sortBy.toUpperCase()}
        `;
        const { rows } = await this.query(query);
        return rows.map(row => ({
            variantId: row.variantId,
            sku: row.sku,
            productName: row.productName,
            stockQty: Number(row.stockQty),
            reservedQty: 0,
            thresholdQty: Number(row.thresholdQty),
            healthStatus: this.calculateHealth(Number(row.stockQty), Number(row.thresholdQty)),
            size: row.size ?? null,
            colour: row.colour ?? null
        }));
    }

    async getVariant(variantId: string): Promise<VariantStock | null> {
        const query = `
            SELECT 
                v.id as "variantId", 
                v.sku,
                v.size,
                v.colour,
                p.name as "productName", 
                v.qty as "stockQty",
                v.threshold_qty as "thresholdQty"
            FROM variants v
            JOIN products p ON v.product_id = p.id
            WHERE v.id = $1 AND v.is_deleted = false
        `;
        const { rows } = await this.query(query, [variantId]);
        if (!rows.length) return null;
        const row = rows[0];
        return {
            variantId: row.variantId,
            sku: row.sku,
            productName: row.productName,
            stockQty: Number(row.stockQty),
            reservedQty: 0,
            thresholdQty: Number(row.thresholdQty),
            healthStatus: this.calculateHealth(Number(row.stockQty), Number(row.thresholdQty)),
            size: row.size ?? null,
            colour: row.colour ?? null
        };
    }

    private readonly VALID_REASONS = [
        'damaged', 'miscounted', 'theft', 'return_restocked',
        'supplier_short_shipped', 'initial_stock', 'correction', 'other'
    ];

    async adjustStock(variantId: string, newQty: number, reason: string, adminUserId: string): Promise<VariantStock> {
        if (!this.VALID_REASONS.includes(reason)) {
            throw new Error(`Invalid adjustment reason: ${reason}`);
        }

        return this.withTransaction(async (client) => {
            // 1. Lock variant row for update
            const oldRes = await client.query('SELECT qty FROM variants WHERE id = $1 FOR UPDATE', [variantId]);
            if (!oldRes.rows.length) throw new Error(`Variant ${variantId} not found`);
            const oldQty = oldRes.rows[0].qty;

            // 2. Update variant qty
            const updateQuery = `
                UPDATE variants 
                SET qty = $2, updated_at = now() 
                WHERE id = $1 
                RETURNING *
            `;
            await client.query(updateQuery, [variantId, newQty]);

            // 3. Insert into stock_adjustments (INSERT-ONLY table)
            const logQuery = `
                INSERT INTO stock_adjustments (variant_id, before_qty, after_qty, reason, adjusted_by)
                VALUES ($1, $2, $3, $4, $5)
            `;
            // Note: 'reason' must be one of the adjustment_reason enum values
            await client.query(logQuery, [variantId, oldQty, newQty, reason, adminUserId]);
            
            const variant = await this.getVariant(variantId);
            if (!variant) throw new Error('Variant not found after update');
            return variant;
        });
    }

    async updateThreshold(variantId: string, threshold: number): Promise<void> {
        const query = `
            UPDATE variants 
            SET threshold_qty = $1, updated_at = now() 
            WHERE id = $2
        `;
        await this.query(query, [threshold, variantId]);
    }

    async getHealthSummary(): Promise<{ status: string; count: number }[]> {
        const query = `
            SELECT 
                CASE 
                    WHEN qty <= 0 THEN 'CRITICAL'
                    WHEN qty < threshold_qty THEN 'WARNING'
                    ELSE 'HEALTHY'
                END as status,
                COUNT(*) as count
            FROM variants
            WHERE is_deleted = false
            GROUP BY status
        `;
        const { rows } = await this.query(query);
        return rows.map(r => ({ status: r.status, count: parseInt(r.count, 10) }));
    }

    private calculateHealth(stockQty: number, threshold: number): string {
        if (stockQty <= 0) return 'CRITICAL';
        if (stockQty < threshold) return 'WARNING';
        return 'HEALTHY';
    }

    async getInventoryWithSalesData(): Promise<VariantStock[]> {
        const query = `
            WITH sales_30d AS (
                SELECT 
                    variant_id, 
                    COALESCE(SUM(quantity), 0) / 30.0 as avg_sales
                FROM order_items
                WHERE created_at >= now() - interval '30 days'
                GROUP BY variant_id
            )
            SELECT 
                v.id as "variantId", 
                v.sku, 
                v.size,
                v.colour,
                p.name as "productName", 
                v.qty as "stockQty",
                v.threshold_qty as "thresholdQty",
                COALESCE(s.avg_sales, 0) as "avgDailySales"
            FROM variants v
            JOIN products p ON v.product_id = p.id
            LEFT JOIN sales_30d s ON v.id = s.variant_id
            WHERE v.is_deleted = false
            ORDER BY v.qty ASC
        `;
        const { rows } = await this.query(query);
        return rows.map(row => {
            const stockQty = Number(row.stockQty);
            const avgDailySales = Number(row.avgDailySales);
            // If avgDailySales is 0, daysRemaining is practically Infinity (but we use 999 for UI)
            const daysRemaining = avgDailySales > 0 ? Math.floor(stockQty / avgDailySales) : 999;
            
            return {
                variantId: row.variantId,
                sku: row.sku,
                productName: row.productName,
                stockQty,
                reservedQty: 0,
                thresholdQty: Number(row.thresholdQty),
                healthStatus: this.calculateHealth(stockQty, Number(row.thresholdQty)),
                avgDailySales,
                daysRemaining,
                size: row.size ?? null,
                colour: row.colour ?? null
            };
        });
    }

    async getRestockSuggestions(): Promise<VariantStock[]> {
        const all = await this.getInventoryWithSalesData();
        // RULE INV-10: Variants with < 7 days remaining
        return all.filter(v => (v.daysRemaining !== undefined && v.daysRemaining < 7) || v.healthStatus === 'CRITICAL');
    }
}
