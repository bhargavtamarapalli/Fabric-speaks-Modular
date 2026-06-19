import { BaseRepository } from '@fs/shared';

export interface VariantTemplate {
  id: string;
  name: string;
  sizes: string[];
  colours: string[];
  createdAt: string;
}

export class VariantTemplateRepository extends BaseRepository {
  async findAll(): Promise<VariantTemplate[]> {
    const result = await this.query(
      'SELECT * FROM variant_templates ORDER BY name ASC'
    );
    return result.rows.map(row => this.mapToCamelCase<VariantTemplate>(row));
  }

  async create(name: string, sizes: string[], colours: string[]): Promise<VariantTemplate> {
    const result = await this.query(
      'INSERT INTO variant_templates (name, sizes, colours) VALUES ($1, $2, $3) RETURNING *',
      [name, sizes, colours]
    );
    return this.mapToCamelCase<VariantTemplate>(result.rows[0]);
  }

  async findByName(name: string): Promise<VariantTemplate | null> {
    const result = await this.query(
      'SELECT * FROM variant_templates WHERE name = $1',
      [name]
    );
    return result.rows[0] ? this.mapToCamelCase<VariantTemplate>(result.rows[0]) : null;
  }

  async update(id: string, sizes: string[], colours: string[]): Promise<VariantTemplate> {
    const result = await this.query(
      'UPDATE variant_templates SET sizes = $1, colours = $2, updated_at = now() WHERE id = $3 RETURNING *',
      [sizes, colours, id]
    );
    return this.mapToCamelCase<VariantTemplate>(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM variant_templates WHERE id = $1', [id]);
  }
}
