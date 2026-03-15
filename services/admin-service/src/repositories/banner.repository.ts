import { BaseRepository } from '@fs/shared';

export interface Banner {
  id: string;
  title: string;
  image_mobile_url: string;
  image_desktop_url: string;
  link_url?: string;
  utm_params?: string;
  starts_at: Date;
  ends_at?: Date;
  is_active: boolean;
  created_by: string;
  created_at: Date;
}

export class BannerRepository extends BaseRepository {
  async create(data: Omit<Banner, 'id' | 'created_at'>): Promise<Banner> {
    const query = `
      INSERT INTO banners (
        title, image_mobile_url, image_desktop_url, link_url, utm_params, 
        starts_at, ends_at, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const { rows } = await this.query(query, [
      data.title, data.image_mobile_url, data.image_desktop_url, data.link_url, 
      data.utm_params, data.starts_at, data.ends_at, data.is_active, data.created_by
    ]);
    return rows[0];
  }

  async list(filters: { isActive?: boolean; limit?: number; offset?: number } = {}): Promise<Banner[]> {
    let query = 'SELECT * FROM banners WHERE 1=1';
    const params = [];

    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      query += ` OFFSET $${params.length}`;
    }

    const { rows } = await this.query(query, params);
    return rows;
  }

  async findById(id: string): Promise<Banner | null> {
    const { rows } = await this.query('SELECT * FROM banners WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async update(id: string, data: Partial<Omit<Banner, 'id' | 'created_at' | 'created_by'>>): Promise<Banner> {
    const sets: string[] = [];
    const params: any[] = [id];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        params.push(value);
        sets.push(`${key} = $${params.length}`);
      }
    });

    const query = `
      UPDATE banners 
      SET ${sets.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await this.query(query, params);
    return rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.query('DELETE FROM banners WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
