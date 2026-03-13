import { BaseRepository } from '@fs/shared';

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
    async list(filters: any): Promise<{ items: AdminPage[]; meta: any }> {
        let query = 'SELECT * FROM content_pages WHERE 1=1';
        const params: any[] = [];
        const { rows } = await this.query(query, params);
        return {
            items: rows.map(r => this.mapToCamelCase<AdminPage>(r)),
            meta: { total: rows.length }
        };
    }

    async create(data: any): Promise<AdminPage> {
        const query = `
            INSERT INTO content_pages (title, slug, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const { rows } = await this.query(query, [data.title, data.slug, data.content]);
        return this.mapToCamelCase<AdminPage>(rows[0]);
    }

    async update(id: string, data: any): Promise<AdminPage | null> {
        const query = 'UPDATE content_pages SET title = $2, content = $3, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, data.title, data.content]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminPage>(rows[0]);
    }

    async findById(id: string): Promise<AdminPage | null> {
        const { rows } = await this.query('SELECT * FROM content_pages WHERE id = $1', [id]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminPage>(rows[0]);
    }
}
