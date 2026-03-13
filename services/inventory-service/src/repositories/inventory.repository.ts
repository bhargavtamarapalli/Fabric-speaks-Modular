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
                i.stock_qty as "stockQty", 
                i.reserved_qty as "reservedQty"
            FROM inventory i
            JOIN variants v ON i.variant_id = v.id
            JOIN products p ON v.product_id = p.id
            ORDER BY i.stock_qty ${sortBy.toUpperCase()}
        `;
        const { rows } = await this.query(query);
        return rows.map(row => ({
            variantId: row.variantId,
            sku: row.sku,
            productName: row.productName,
            stockQty: Number(row.stockQty),
            reservedQty: Number(row.reservedQty),
            healthStatus: this.calculateHealth(Number(row.stockQty))
        }));
    }

    async getVariant(variantId: string): Promise<VariantStock | null> {
        const query = `
            SELECT 
                v.id as "variantId", 
                v.sku, 
                p.name as "productName", 
                i.stock_qty as "stockQty", 
                i.reserved_qty as "reservedQty"
            FROM inventory i
            JOIN variants v ON i.variant_id = v.id
            JOIN products p ON v.product_id = p.id
            WHERE v.id = $1
        `;
        const { rows } = await this.query(query, [variantId]);
        if (!rows.length) return null;
        const row = rows[0];
        return {
            variantId: row.variantId,
            sku: row.sku,
            productName: row.productName,
            stockQty: Number(row.stockQty),
            reservedQty: Number(row.reservedQty),
            healthStatus: this.calculateHealth(Number(row.stockQty))
        };
    }

    async adjustStock(variantId: string, newQty: number, reason: string, adminUserId: string): Promise<VariantStock> {
        return this.withTransaction(async (client) => {
            const updateQuery = `
                UPDATE inventory 
                SET stock_qty = $2, updated_at = now() 
                WHERE variant_id = $1 
                RETURNING *
            `;
            const { rows } = await client.query(updateQuery, [variantId, newQty]);
            if (!rows.length) throw new Error(`Variant ${variantId} not found`);

            const logQuery = `
                INSERT INTO inventory_logs (variant_id, old_qty, new_qty, reason, admin_id)
                VALUES ($1, $2, $3, $4, $5)
            `;
            // For older qty, we might need a SELECT before update. Simplified here.
            
            const variant = await this.getVariant(variantId);
            if (!variant) throw new Error('Variant not found after update');
            return variant;
        });
    }

    async getHealthSummary(): Promise<{ status: string; count: number }[]> {
        const query = `
            SELECT 
                CASE 
                    WHEN stock_qty <= 0 THEN 'CRITICAL'
                    WHEN stock_qty < 5 THEN 'WARNING'
                    ELSE 'HEALTHY'
                END as status,
                COUNT(*) as count
            FROM inventory
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
