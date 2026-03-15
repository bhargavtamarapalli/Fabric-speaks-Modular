import { BaseRepository } from '@fs/shared';
import { SearchQueryDto } from '../schemas/search.schemas';

export interface SearchProductItem {
    id: string;
    slug: string;
    name: string;
    description: string;
    basePrice: number;
    fabricType: string;
    images: string[];
    brandName: string;
    categoryName: string;
}

export interface SearchResult<T> {
    data: T[];
    total: number;
}

export class SearchRepository extends BaseRepository {
    async searchProducts(dto: SearchQueryDto): Promise<SearchResult<SearchProductItem>> {
        const { q, fabric, brand, minPrice, maxPrice, size, colour, sort, page = 1, limit = 20 } = dto;
        
        let baseQuery = `
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = true
        `;
        
        const params: unknown[] = [];
        let paramIndex = 1;

        if (q) {
            baseQuery += ` AND to_tsvector('english', p.name || ' ' || COALESCE(p.fabric_type, '')) @@ plainto_tsquery('english', $${paramIndex})`;
            params.push(q);
            paramIndex++;
        }

        if (fabric) {
            baseQuery += ` AND p.fabric_type ILIKE $${paramIndex} ESCAPE '\\'`;
            params.push(`%${this.escapePattern(fabric)}%`);
            paramIndex++;
        }

        if (brand) {
            baseQuery += ` AND b.name ILIKE $${paramIndex} ESCAPE '\\'`;
            params.push(`%${this.escapePattern(brand)}%`);
            paramIndex++;
        }

        if (minPrice !== undefined) {
            baseQuery += ` AND p.base_price >= $${paramIndex}`;
            params.push(minPrice);
            paramIndex++;
        }

        if (maxPrice !== undefined) {
            baseQuery += ` AND p.base_price <= $${paramIndex}`;
            params.push(maxPrice);
            paramIndex++;
        }

        if (size || colour) {
            baseQuery += ` AND EXISTS (
                SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.is_deleted = false
            `;
            if (size) {
                 baseQuery += ` AND v.size = $${paramIndex}`;
                 params.push(size);
                 paramIndex++;
            }
            if (colour) {
                 baseQuery += ` AND v.color = $${paramIndex}`;
                 params.push(colour);
                 paramIndex++;
            }
            baseQuery += `)`;
        }

        // Count total
        const countResult = await this.query(`SELECT COUNT(*) ${baseQuery}`, params);
        const total = parseInt(countResult.rows[0].count, 10);

        // Sorting
        let orderBy = '';
        if (sort === 'price_asc') orderBy = ` ORDER BY p.base_price ASC`;
        else if (sort === 'price_desc') orderBy = ` ORDER BY p.base_price DESC`;
        else if (sort === 'newest') orderBy = ` ORDER BY p.created_at DESC`;
        else {
             if (q) {
                 orderBy = ` ORDER BY ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.fabric_type, '')), plainto_tsquery('english', $1)) DESC`;
             } else {
                 orderBy = ` ORDER BY p.created_at DESC`;
             }
        }

        // Pagination
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT 
                p.id, p.slug, p.name, p.description, p.base_price, p.fabric_type, p.images,
                b.name as brand_name,
                c.name as category_name
            ${baseQuery}
            ${orderBy}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const finalParams = [...params, limit, offset];
        const result = await this.query(dataQuery, finalParams);

        return {
            data: result.rows.map(row => this.mapToCamelCase<SearchProductItem>(row)),
            total
        };
    }

    async getSuggestions(q: string): Promise<Array<{ id: string, slug: string, name: string, thumbnail: string }>> {
        const query = `
            SELECT id, slug, name, images[1] as thumbnail
            FROM products
            WHERE is_active = true 
              AND name ILIKE $1 ESCAPE '\\'
            ORDER BY created_at DESC
            LIMIT 5
        `;
        const result = await this.query(query, [`%${this.escapePattern(q)}%`]);
        return result.rows;
    }

    async logSearchQuery(query: string, filters: Record<string, unknown> | null, userId?: string, sessionId?: string, resultCount: number = 0): Promise<void> {
        const sql = `
            INSERT INTO search_logs (query, filters, user_id, session_id, result_count)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await this.query(sql, [
            query, 
            filters ? JSON.stringify(filters) : null, 
            userId || null, 
            sessionId || null,
            resultCount
        ]);
    }

    private escapePattern(val: string): string {
        return val.replace(/[%_]/g, '\\$&');
    }
}
