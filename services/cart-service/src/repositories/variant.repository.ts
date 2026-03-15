import { BaseRepository } from '@fs/shared';

export interface VariantStockDetails {
    stockQty: number;
    basePrice: number;
    salePrice: number | null;
}

export class VariantRepository extends BaseRepository {
    async getVariantStockDetails(variantId: string): Promise<VariantStockDetails | null> {
        const query = `
            SELECT stock_qty, base_price, sale_price 
            FROM variants 
            WHERE id = $1 AND is_deleted = false
        `;
        const result = await this.query(query, [variantId]);
        
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            stockQty: Number(row.stock_qty),
            basePrice: Number(row.base_price),
            salePrice: row.sale_price !== null ? Number(row.sale_price) : null
        };
    }
}
