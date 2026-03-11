import { query } from '@fs/shared/db';
import { v4 as uuidv4 } from 'uuid';
import { CreatePageDto, PageListQueryDto, UpdatePageDto } from '../schemas/page.schemas';
import { PaginatedResponse } from '@fs/shared/types';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const domPurify = DOMPurify(window as unknown as Window);

export class PageRepository {
  async list(filters: PageListQueryDto): Promise<PaginatedResponse<any>> {
    const params: any[] = [];
    let whereClause = '1=1';

    if (filters['filter[status]']) {
      params.push(filters['filter[status]']);
      whereClause += ` AND status = $${params.length}`;
    }

    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT id, title, slug, status, updated_at "updatedAt"
      FROM content_pages
      WHERE ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `SELECT COUNT(*) FROM content_pages WHERE ${whereClause}`;

    const [dataRes, countRes] = await Promise.all([
      query(sql, [...params, limit, offset]),
      query(countSql, params),
    ]);
    const total = parseInt(countRes.rows[0].count, 10);

    return {
      items: dataRes.rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlugOrId(identifier: string): Promise<any | null> {
    const { rows } = await query(
      `SELECT * FROM content_pages WHERE id = $1 OR slug = $1`,
      [identifier]
    );
    return rows[0] || null;
  }

  async create(data: CreatePageDto): Promise<any> {
    const id = uuidv4();
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeHtml = domPurify.sanitize(data.bodyHtml);

    const sql = `
      INSERT INTO content_pages (
        id, title, slug, body_html, hero_image_url, 
        related_product_ids, seo_meta, status, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, slug, status
    `;

    const publishedAt = data.status === 'published' ? new Date().toISOString() : null;

    const params = [
      id,
      data.title,
      slug,
      safeHtml,
      data.heroImageUrl || null,
      data.relatedProductIds ? JSON.stringify(data.relatedProductIds) : null,
      data.seoMeta ? JSON.stringify(data.seoMeta) : null,
      data.status,
      publishedAt
    ];

    const { rows } = await query(sql, params);
    return rows[0];
  }

  async update(id: string, data: UpdatePageDto): Promise<any> {
    const setParts: string[] = [];
    const params: any[] = [id];
    let paramIdx = 2;

    if (data.title !== undefined) { setParts.push(`title = $${paramIdx++}`); params.push(data.title); }
    if (data.slug !== undefined) { setParts.push(`slug = $${paramIdx++}`); params.push(data.slug); }
    if (data.bodyHtml !== undefined) { 
      setParts.push(`body_html = $${paramIdx++}`); 
      params.push(domPurify.sanitize(data.bodyHtml)); 
    }
    if (data.heroImageUrl !== undefined) { setParts.push(`hero_image_url = $${paramIdx++}`); params.push(data.heroImageUrl); }
    if (data.relatedProductIds !== undefined) { setParts.push(`related_product_ids = $${paramIdx++}`); params.push(JSON.stringify(data.relatedProductIds)); }
    if (data.seoMeta !== undefined) { setParts.push(`seo_meta = $${paramIdx++}`); params.push(JSON.stringify(data.seoMeta)); }
    
    if (data.status !== undefined) { 
      setParts.push(`status = $${paramIdx++}`); params.push(data.status); 
      if (data.status === 'published') {
        setParts.push(`published_at = NOW()`);
      }
    }

    if (setParts.length === 0) return null;

    setParts.push(`updated_at = NOW()`);
    const sql = `UPDATE content_pages SET ${setParts.join(', ')} WHERE id = $1 RETURNING id, status, published_at as "publishedAt"`;
    
    const { rows } = await query(sql, params);
    return rows[0];
  }
}

export const pageRepository = new PageRepository();
