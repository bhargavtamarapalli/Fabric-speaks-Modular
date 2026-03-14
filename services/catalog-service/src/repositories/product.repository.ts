import { BaseRepository, Product, IProductRepository, CreateProductDto, UpdateProductDto, ProductQueryDto } from '@fs/shared';

export { Product };

export class ProductRepository extends BaseRepository implements IProductRepository {
    async findById(id: string): Promise<Product | null> {
        const result = await this.query(
            'SELECT * FROM products WHERE id = $1 AND is_deleted = false',
            [id]
        );
        return result.rows[0] ? this.mapToCamelCase<Product>(result.rows[0]) : null;
    }

    async findBySlug(slug: string): Promise<Product | null> {
        const result = await this.query(
            'SELECT * FROM products WHERE slug = $1 AND is_deleted = false',
            [slug]
        );
        return result.rows[0] ? this.mapToCamelCase<Product>(result.rows[0]) : null;
    }

    async findAll(filters: ProductQueryDto): Promise<{ items: Product[]; total: number }> {
        const { page, limit, search, fabric, brand, minPrice, maxPrice } = filters;
        const offset = (page - 1) * limit;
        
        let queryStr = 'SELECT p.*, COUNT(*) OVER() as total_count FROM products p ';
        const whereClauses: string[] = ['is_deleted = false'];
        const params: unknown[] = [];
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

        if (minPrice !== undefined || maxPrice !== undefined) {
             queryStr += 'JOIN variants v ON p.id = v.product_id ';
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

        queryStr += ' WHERE ' + whereClauses.join(' AND ');
        queryStr += ` ORDER BY p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        params.push(limit, offset);

        const result = await this.query(queryStr, params);
        const items = result.rows.map(row => this.mapToCamelCase<Product>(row));
        const total = result.rows[0] ? parseInt(result.rows[0].total_count) : 0;

        return { items, total };
    }

    async create(dto: CreateProductDto): Promise<Product> {
        const snakeDto = this.mapToSnakeCase(dto);
        const columns = Object.keys(snakeDto);
        const values = Object.values(snakeDto);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const queryStr = `INSERT INTO products (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.query(queryStr, values);
        return this.mapToCamelCase<Product>(result.rows[0]);
    }

    async update(id: string, dto: UpdateProductDto): Promise<Product> {
        const snakeDto = this.mapToSnakeCase(dto);
        const updates: string[] = [];
        const values: unknown[] = [id];
        let paramIdx = 2;

        for (const [key, value] of Object.entries(snakeDto)) {
            updates.push(`${key} = $${paramIdx}`);
            values.push(value);
            paramIdx++;
        }

        const queryStr = `UPDATE products SET ${updates.join(', ')}, updated_at = now() WHERE id = $1 AND is_deleted = false RETURNING *`;
        const result = await this.query(queryStr, values);
        if (!result.rows[0]) throw new Error('Product not found');
        return this.mapToCamelCase<Product>(result.rows[0]);
    }

    async softDelete(id: string): Promise<void> {
        await this.query(
            'UPDATE products SET is_deleted = true, updated_at = now() WHERE id = $1',
            [id]
        );
    }
}
