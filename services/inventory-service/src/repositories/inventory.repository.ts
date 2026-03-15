import { BaseRepository } from '@fs/shared';

export interface VariantStock {
    variantId: string;
    sku: string;
    productName: string;
    stockQty: number;
    reservedQty: number;
    healthStatus: string;
}

export class InventoryRepository extends BaseRepository {
    async getAllVariants(sortBy: 'asc' | 'desc' = 'asc'): Promise<VariantStock[]> {
        const query = `
            SELECT 
                v.id as "variantId", 
                v.sku, 
                p.name as "productName", 
                v.qty as "stockQty"
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
            reservedQty: 0, // Not tracked in variants table currently
            healthStatus: this.calculateHealth(Number(row.stockQty))
        }));
    }

    async getVariant(variantId: string): Promise<VariantStock | null> {
        const query = `
            SELECT 
                v.id as "variantId", 
                v.sku, 
                p.name as "productName", 
                v.qty as "stockQty"
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
            healthStatus: this.calculateHealth(Number(row.stockQty))
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

    async getHealthSummary(): Promise<{ status: string; count: number }[]> {
        const query = `
            SELECT 
                CASE 
                    WHEN qty <= 0 THEN 'CRITICAL'
                    WHEN qty < 5 THEN 'WARNING'
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

    private calculateHealth(stockQty: number): string {
        if (stockQty <= 0) return 'CRITICAL';
        if (stockQty < 5) return 'WARNING';
        return 'HEALTHY';
    }
}
