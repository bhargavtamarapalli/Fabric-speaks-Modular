import { BaseRepository } from '@fs/shared';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { CreatePageDto, UpdatePageDto } from '../schemas/page.schemas';

const window = new JSDOM('').window;
const dompurify = createDOMPurify(window as any);

export interface AdminPage {
    id: string;
    title: string;
    slug: string;
    content: string;
    heroImageUrl: string | null;
    relatedProductIds: string[];
    seoMeta: Record<string, unknown> | null;
    status: 'draft' | 'published' | 'archived';
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export class PageRepository extends BaseRepository {
    async list(filters: { page?: number; limit?: number; 'filter[status]'?: 'draft' | 'published' | 'archived'; 'filter[is_active]'?: boolean }): Promise<{ items: AdminPage[]; meta: { total: number; page: number; limit: number } }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        const params: unknown[] = [];
        let whereClause = 'is_deleted = false';

        if (filters['filter[status]']) {
            params.push(filters['filter[status]']);
            whereClause += ` AND status = $${params.length}`;
        } else if (filters['filter[is_active]'] === true) {
            whereClause += ` AND status = 'published'`;
        } else if (filters['filter[is_active]'] === false) {
            whereClause += ` AND status <> 'published'`;
        }

        let query = `
            SELECT
                id,
                title,
                slug,
                body_html AS content,
                hero_image_url AS "heroImageUrl",
                COALESCE(related_product_ids, '[]'::jsonb) AS "relatedProductIds",
                seo_meta_json AS "seoMeta",
                status,
                published_at AS "publishedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            FROM content_pages
            WHERE ${whereClause}
        `;
        
        query += ` ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await this.query(query, params);
        
        const countRes = await this.query(
            `SELECT COUNT(*) FROM content_pages WHERE ${whereClause}`,
            params.slice(0, params.length - 2)
        );

        return {
            items: rows.map(r => this.mapRowToAdminPage(r)),
            meta: { 
                total: parseInt(countRes.rows[0].count),
                page,
                limit
            }
        };
    }

    async create(data: CreatePageDto): Promise<AdminPage> {
        const safeHtml = dompurify.sanitize(data.content);
        const slug = data.slug ?? this.slugify(data.title);
        const query = `
            INSERT INTO content_pages (
                title,
                slug,
                body_html,
                hero_image_url,
                related_product_ids,
                seo_meta_json,
                status,
                published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 = 'published' THEN now() ELSE NULL END)
            RETURNING
                id,
                title,
                slug,
                body_html AS content,
                hero_image_url AS "heroImageUrl",
                COALESCE(related_product_ids, '[]'::jsonb) AS "relatedProductIds",
                seo_meta_json AS "seoMeta",
                status,
                published_at AS "publishedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
        `;
        const { rows } = await this.query(query, [
            data.title,
            slug,
            safeHtml,
            data.heroImageUrl ?? null,
            JSON.stringify(data.relatedProductIds ?? []),
            data.seoMeta ? JSON.stringify(data.seoMeta) : null,
            data.status
        ]);
        return this.mapRowToAdminPage(rows[0]);
    }

    async update(id: string, data: UpdatePageDto): Promise<AdminPage | null> {
        const safeHtml = data.content ? dompurify.sanitize(data.content) : undefined;
        const updates: string[] = [];
        const values: unknown[] = [id];
        let index = 2;

        if (data.title !== undefined) { updates.push(`title = $${index++}`); values.push(data.title); }
        if (data.slug !== undefined) { updates.push(`slug = $${index++}`); values.push(data.slug); }
        if (safeHtml !== undefined) { updates.push(`body_html = $${index++}`); values.push(safeHtml); }
        if (data.heroImageUrl !== undefined) { updates.push(`hero_image_url = $${index++}`); values.push(data.heroImageUrl || null); }
        if (data.relatedProductIds !== undefined) { updates.push(`related_product_ids = $${index++}`); values.push(JSON.stringify(data.relatedProductIds)); }
        if (data.seoMeta !== undefined) { updates.push(`seo_meta_json = $${index++}`); values.push(data.seoMeta ? JSON.stringify(data.seoMeta) : null); }
        if (data.status !== undefined) {
            updates.push(`status = $${index++}`);
            values.push(data.status);
            updates.push(`published_at = CASE WHEN $${index - 1} = 'published' THEN COALESCE(published_at, now()) WHEN $${index - 1} = 'draft' THEN NULL ELSE published_at END`);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        const query = `
            UPDATE content_pages
            SET ${updates.join(', ')}, updated_at = now()
            WHERE id = $1 AND is_deleted = false
            RETURNING
                id,
                title,
                slug,
                body_html AS content,
                hero_image_url AS "heroImageUrl",
                COALESCE(related_product_ids, '[]'::jsonb) AS "relatedProductIds",
                seo_meta_json AS "seoMeta",
                status,
                published_at AS "publishedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
        `;
        const { rows } = await this.query(query, values);
        if (!rows.length) return null;
        return this.mapRowToAdminPage(rows[0]);
    }

    async findById(id: string): Promise<AdminPage | null> {
        const { rows } = await this.query(`
            SELECT
                id,
                title,
                slug,
                body_html AS content,
                hero_image_url AS "heroImageUrl",
                COALESCE(related_product_ids, '[]'::jsonb) AS "relatedProductIds",
                seo_meta_json AS "seoMeta",
                status,
                published_at AS "publishedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            FROM content_pages
            WHERE id = $1 AND is_deleted = false
        `, [id]);
        if (!rows.length) return null;
        return this.mapRowToAdminPage(rows[0]);
    }

    private mapRowToAdminPage(row: any): AdminPage {
        return {
            id: row.id,
            title: row.title,
            slug: row.slug,
            content: row.content,
            heroImageUrl: row.heroImageUrl ?? null,
            relatedProductIds: Array.isArray(row.relatedProductIds) ? row.relatedProductIds : [],
            seoMeta: row.seoMeta ?? null,
            status: row.status,
            publishedAt: row.publishedAt ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private slugify(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 250);
    }
}
