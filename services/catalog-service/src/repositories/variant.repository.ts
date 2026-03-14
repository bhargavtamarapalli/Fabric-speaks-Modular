import { BaseRepository, Variant, IVariantRepository } from '@fs/shared';

export { Variant };

export class VariantRepository extends BaseRepository implements IVariantRepository {
    async findById(id: string): Promise<Variant | null> {
        const result = await this.query(
            'SELECT * FROM variants WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
    }

    async findByProductId(productId: string): Promise<Variant[]> {
        const result = await this.query(
            'SELECT * FROM variants WHERE product_id = $1 AND is_deleted = false',
            [productId]
        );
        return result.rows.map(row => this.mapVariant(row));
    }

    async findBySku(sku: string): Promise<Variant | null> {
        const result = await this.query(
            'SELECT * FROM variants WHERE sku = $1 AND is_deleted = false',
            [sku]
        );
        return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
    }

    async updateStock(id: string, qty: number): Promise<void> {
        await this.query(
            'UPDATE variants SET qty = $1, updated_at = now() WHERE id = $2',
            [qty, id]
        );
    }

    private mapVariant(row: Record<string, any>): Variant {
        const mapped = this.mapToCamelCase<Variant>(row);
        return {
            ...mapped,
            basePrice: parseFloat(row.base_price),
            priceOverride: row.price_override ? parseFloat(row.price_override) : undefined,
            salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
        };
    }
}
