import { BaseRepository } from '@fs/shared';

export type SaleEventScope = 'global' | 'collection' | 'specific_products' | 'fabric_type';

export interface SaleEvent {
  id: string;
  name: string;
  description?: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  scope: SaleEventScope;
  scope_ids: string[];
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
  paused_at?: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export class SaleEventRepository extends BaseRepository {
  async create(data: Omit<SaleEvent, 'id' | 'created_at' | 'updated_at'>): Promise<SaleEvent> {
    const query = `
      INSERT INTO sale_events (
        name, description, discount_type, discount_value, scope, scope_ids, 
        starts_at, ends_at, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const { rows } = await this.query(query, [
      data.name, data.description, data.discount_type, data.discount_value, 
      data.scope, JSON.stringify(data.scope_ids), data.starts_at, data.ends_at, 
      data.is_active, data.created_by
    ]);
    return this.mapToCamelCase<SaleEvent>(rows[0]);
  }

  async list(filters: { isActive?: boolean; limit?: number; offset?: number } = {}): Promise<SaleEvent[]> {
    let query = 'SELECT * FROM sale_events WHERE 1=1';
    const params: any[] = [];

    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY starts_at DESC';

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    const { rows } = await this.query(query, params);
    return rows.map(r => this.mapToCamelCase<SaleEvent>(r));
  }

  async findById(id: string): Promise<SaleEvent | null> {
    const { rows } = await this.query('SELECT * FROM sale_events WHERE id = $1', [id]);
    if (!rows.length) return null;
    return this.mapToCamelCase<SaleEvent>(rows[0]);
  }

  async update(id: string, data: Partial<Omit<SaleEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<SaleEvent> {
    const sets: string[] = [];
    const params: any[] = [id];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'scope_ids') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
        sets.push(`${key} = $${params.length}`);
      }
    });

    const query = `
      UPDATE sale_events 
      SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await this.query(query, params);
    return this.mapToCamelCase<SaleEvent>(rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.query('DELETE FROM sale_events WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async findActiveAt(date: Date = new Date()): Promise<SaleEvent[]> {
    const query = `
      SELECT * FROM sale_events 
      WHERE is_active = true 
      AND starts_at <= $1 
      AND ends_at >= $1
    `;
    const { rows } = await this.query(query, [date]);
    return rows.map(r => this.mapToCamelCase<SaleEvent>(r));
  }
}
