import { Pool } from 'pg';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../schemas/catalog.schemas';

export interface Product {
    id: string;
    brandId: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    fabric_type: string;
    gsm_weight: number;
    weave_type: string;
    breathability_rating: string;
    care_instructions: string;
    fabric_origin: string;
    attributes: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProductRepository {
    findById(id: string): Promise<Product | null>;
    findBySlug(slug: string): Promise<Product | null>;
    findAll(filters: ProductQueryDto): Promise<{ items: Product[]; total: number }>;
    create(dto: CreateProductDto): Promise<Product>;
    update(id: string, dto: UpdateProductDto): Promise<Product>;
    softDelete(id: string): Promise<void>;
}

export class ProductRepository implements IProductRepository {
    constructor(private db: Pool) {}

    async findById(id: string): Promise<Product | null> {
        const result = await this.db.query(
            'SELECT * FROM products WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapProduct(result.rows[0]) : null;
    }

    async findBySlug(slug: string): Promise<Product | null> {
        const result = await this.db.query(
            'SELECT * FROM products WHERE slug = $1 AND is_deleted = false',
            [slug]
        );
        return result.rows[0] ? this.mapProduct(result.rows[0]) : null;
    }

    async findAll(filters: ProductQueryDto): Promise<{ items: Product[]; total: number }> {
        const { page, limit, search, fabric, brand, minPrice, maxPrice } = filters;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT p.*, COUNT(*) OVER() as total_count FROM products p ';
        const whereClauses: string[] = ['is_deleted = false'];
        const params: any[] = [];
        let paramIdx = 1;

        if (search) {
            whereClauses.push(`(to_tsvector('english', p.name || ' ' || p.fabric_type) @@ plainto_tsquery('english', $${paramIdx}))`);
            params.push(search);
            paramIdx++;
        }

        if (fabric) {
            whereClauses.push(`p.fabric_type = $${paramIdx}`);
            params.push(fabric);
            paramIdx++;
        }

        if (brand) {
            whereClauses.push(`p.brand_id = $${paramIdx}`);
            params.push(brand);
            paramIdx++;
        }

        // Note: price filtering usually involves joining variants
        if (minPrice !== undefined || maxPrice !== undefined) {
             query += 'JOIN variants v ON p.id = v.product_id ';
             if (minPrice !== undefined) {
                 whereClauses.push(`v.base_price >= $${paramIdx}`);
                 params.push(minPrice);
                 paramIdx++;
             }
             if (maxPrice !== undefined) {
                 whereClauses.push(`v.base_price <= $${paramIdx}`);
                 params.push(maxPrice);
                 paramIdx++;
             }
        }

        query += ' WHERE ' + whereClauses.join(' AND ');
        query += ` ORDER BY p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        params.push(limit, offset);

        const result = await this.db.query(query, params);
        const items = result.rows.map(row => this.mapProduct(row));
        const total = result.rows[0] ? parseInt(result.rows[0].total_count) : 0;

        return { items, total };
    }

    async create(dto: CreateProductDto): Promise<Product> {
        const columns = Object.keys(dto).map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
        const values = Object.values(dto);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO products (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.db.query(query, values);
        return this.mapProduct(result.rows[0]);
    }

    async update(id: string, dto: UpdateProductDto): Promise<Product> {
        const updates: string[] = [];
        const values: any[] = [id];
        let paramIdx = 2;

        for (const [key, value] of Object.entries(dto)) {
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            updates.push(`${dbKey} = $${paramIdx}`);
            values.push(value);
            paramIdx++;
        }

        const query = `UPDATE products SET ${updates.join(', ')}, updated_at = now() WHERE id = $1 AND is_deleted = false RETURNING *`;
        const result = await this.db.query(query, values);
        if (!result.rows[0]) throw new Error('Product not found');
        return this.mapProduct(result.rows[0]);
    }

    async softDelete(id: string): Promise<void> {
        await this.db.query(
            'UPDATE products SET is_deleted = true, updated_at = now() WHERE id = $1',
            [id]
        );
    }

    private mapProduct(row: any): Product {
        return {
            id: row.id,
            brandId: row.brand_id,
            categoryId: row.category_id,
            name: row.name,
            slug: row.slug,
            description: row.description,
            fabric_type: row.fabric_type,
            gsm_weight: row.gsm_weight,
            weave_type: row.weave_type,
            breathability_rating: row.breathability_rating,
            care_instructions: row.care_instructions,
            fabric_origin: row.fabric_origin,
            attributes: row.attributes,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
