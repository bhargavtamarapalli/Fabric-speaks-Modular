import { Pool } from 'pg';

export class CatalogIntegrationService {
    constructor(private db: Pool) {}

    async getVariantStockDetails(variantId: string): Promise<{ stock_qty: number; price: number } | null> {
        const query = `
            SELECT stock_qty, base_price, sale_price 
            FROM variants 
            WHERE id = $1 AND is_deleted = false
        `;
        const result = await this.db.query(query, [variantId]);
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        // Calculate effective price taking sale_price into account
        const price = row.sale_price !== null ? Number(row.sale_price) : Number(row.base_price);

        return {
            stock_qty: row.stock_qty,
            price: price
        };
    }
}
