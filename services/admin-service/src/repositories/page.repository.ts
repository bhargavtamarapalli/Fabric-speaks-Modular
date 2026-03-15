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
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class PageRepository extends BaseRepository {
    async list(filters: { page?: number; limit?: number }): Promise<{ items: AdminPage[]; meta: { total: number; page: number; limit: number } }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM content_pages WHERE is_active = true';
        const params: unknown[] = [];
        
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await this.query(query, params);
        
        const countRes = await this.query('SELECT COUNT(*) FROM content_pages WHERE is_active = true');

        return {
            items: rows.map(r => this.mapToCamelCase<AdminPage>(r)),
            meta: { 
                total: parseInt(countRes.rows[0].count),
                page,
                limit
            }
        };
    }

    async create(data: CreatePageDto): Promise<AdminPage> {
        const safeHtml = dompurify.sanitize(data.content);
        const query = `
            INSERT INTO content_pages (title, slug, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const { rows } = await this.query(query, [data.title, data.slug, safeHtml]);
        return this.mapToCamelCase<AdminPage>(rows[0]);
    }

    async update(id: string, data: UpdatePageDto): Promise<AdminPage | null> {
        const safeHtml = data.content ? dompurify.sanitize(data.content) : undefined;
        const query = 'UPDATE content_pages SET title = $2, content = COALESCE($3, content), updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, data.title, safeHtml]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminPage>(rows[0]);
    }

    async findById(id: string): Promise<AdminPage | null> {
        const { rows } = await this.query('SELECT * FROM content_pages WHERE id = $1', [id]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminPage>(rows[0]);
    }
}
