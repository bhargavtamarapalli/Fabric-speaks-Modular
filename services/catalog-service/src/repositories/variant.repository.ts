import { Pool } from 'pg';

export interface Variant {
    id: string;
    productId: string;
    sku: string;
    size?: string;
    colour?: string;
    sizeLabel?: string;
    basePrice: number;
    priceOverride?: number;
    salePrice?: number;
    saleActive: boolean;
    qty: number;
    badges_json: any;
    images_json: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IVariantRepository {
    findById(id: string): Promise<Variant | null>;
    findByProductId(productId: string): Promise<Variant[]>;
    findBySku(sku: string): Promise<Variant | null>;
    updateStock(id: string, qty: number): Promise<void>;
    // ... other methods
}

export class VariantRepository implements IVariantRepository {
    constructor(private db: Pool) {}

    async findById(id: string): Promise<Variant | null> {
        const result = await this.db.query(
            'SELECT * FROM variants WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
    }

    async findByProductId(productId: string): Promise<Variant[]> {
        const result = await this.db.query(
            'SELECT * FROM variants WHERE product_id = $1 AND is_deleted = false',
            [productId]
        );
        return result.rows.map(row => this.mapVariant(row));
    }

    async findBySku(sku: string): Promise<Variant | null> {
        const result = await this.db.query(
            'SELECT * FROM variants WHERE sku = $1 AND is_deleted = false',
            [sku]
        );
        return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
    }

    async updateStock(id: string, qty: number): Promise<void> {
        await this.db.query(
            'UPDATE variants SET qty = $1, updated_at = now() WHERE id = $2',
            [qty, id]
        );
    }

    private mapVariant(row: any): Variant {
        return {
            id: row.id,
            productId: row.product_id,
            sku: row.sku,
            size: row.size,
            colour: row.colour,
            sizeLabel: row.size_label,
            basePrice: parseFloat(row.base_price),
            priceOverride: row.price_override ? parseFloat(row.price_override) : undefined,
            salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
            saleActive: row.sale_active,
            qty: row.qty,
            badges_json: row.badges_json,
            images_json: row.images_json,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
