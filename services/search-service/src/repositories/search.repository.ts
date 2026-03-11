import { Pool } from 'pg';
import { SearchQueryDto } from '../schemas/search.schemas';

export class SearchRepository {
    constructor(private db: Pool) {}

    async searchProducts(dto: SearchQueryDto): Promise<{ data: any[]; total: number }> {
        let query = `
            SELECT 
                p.id, p.slug, p.name, p.description, p.base_price, p.fabric_type, p.images,
                b.name as brand_name,
                c.name as category_name
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = true
        `;
        
        const params: any[] = [];
        let paramIndex = 1;

        if (dto.q) {
            // FTS query on name and fabric_type using GIN index setup in catalog schema
            query += ` AND to_tsvector('english', p.name || ' ' || COALESCE(p.fabric_type, '')) @@ plainto_tsquery('english', $${paramIndex})`;
            params.push(dto.q);
            paramIndex++;
        }

        if (dto.fabric) {
            query += ` AND p.fabric_type ILIKE $${paramIndex}`;
            params.push(`%${dto.fabric}%`);
            paramIndex++;
        }

        if (dto.brand) {
            query += ` AND b.name ILIKE $${paramIndex}`;
            params.push(`%${dto.brand}%`);
            paramIndex++;
        }

        if (dto.min_price !== undefined) {
            query += ` AND p.base_price >= $${paramIndex}`;
            params.push(dto.min_price);
            paramIndex++;
        }

        if (dto.max_price !== undefined) {
            query += ` AND p.base_price <= $${paramIndex}`;
            params.push(dto.max_price);
            paramIndex++;
        }

        // Add size and color filtering (requires joining variants)
        if (dto.size || dto.colour) {
            query += ` AND EXISTS (
                SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.is_deleted = false
            `;
            if (dto.size) {
                 query += ` AND v.size = $${paramIndex}`;
                 params.push(dto.size);
                 paramIndex++;
            }
            if (dto.colour) {
                 query += ` AND v.color = $${paramIndex}`;
                 params.push(dto.colour);
                 paramIndex++;
            }
            query += `)`;
        }

        // Count total
        const countQuery = `SELECT COUNT(*) FROM (${query}) AS subquery`;
        const countResult = await this.db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count, 10);

        // Sorting
        if (dto.sort === 'price_asc') query += ` ORDER BY p.base_price ASC`;
        else if (dto.sort === 'price_desc') query += ` ORDER BY p.base_price DESC`;
        else if (dto.sort === 'newest') query += ` ORDER BY p.created_at DESC`;
        else {
             if (dto.q) {
                 query += ` ORDER BY ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.fabric_type, '')), plainto_tsquery('english', $1)) DESC`;
             } else {
                 query += ` ORDER BY p.created_at DESC`; // fallback for relevance without query
             }
        }

        // Pagination
        const offset = (dto.page! - 1) * dto.limit!;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(dto.limit, offset);

        const result = await this.db.query(query, params);

        return {
            data: result.rows,
            total
        };
    }

    async getSuggestions(q: string): Promise<any[]> {
        const query = `
            SELECT id, slug, name, images[1] as thumbnail
            FROM products
            WHERE is_active = true 
              AND name ILIKE $1
            ORDER BY created_at DESC
            LIMIT 5
        `;
        const result = await this.db.query(query, [`%${q}%`]);
        return result.rows;
    }

    async logSearchQuery(query: string, filters: any, userId?: string, sessionId?: string, resultCount: number = 0): Promise<void> {
        const sql = `
            INSERT INTO search_logs (query, filters, user_id, session_id, result_count)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await this.db.query(sql, [
            query, 
            filters ? JSON.stringify(filters) : null, 
            userId || null, 
            sessionId || null,
            resultCount
        ]);
    }
}
