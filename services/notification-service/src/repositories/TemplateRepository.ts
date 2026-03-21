import { BaseRepository } from '@fs/shared';

export type TemplateStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export interface WhatsAppTemplate {
  id: string;
  templateId: string;
  name: string;
  status: TemplateStatus;
  language: string;
  category: string | null;
  body: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateRepository extends BaseRepository {
  async list(filters: { status?: TemplateStatus; limit?: number; offset?: number }) {
    const params: unknown[] = [];
    let query = 'SELECT * FROM whatsapp_templates WHERE 1=1';

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY updated_at DESC';

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      query += ` OFFSET $${params.length}`;
    }

    const { rows } = await this.query(query, params);
    return rows.map((row) => this.mapRow(row));
  }

  async findByTemplateId(templateId: string) {
    const { rows } = await this.query('SELECT * FROM whatsapp_templates WHERE template_id = $1', [templateId]);
    if (!rows.length) return null;
    return this.mapRow(rows[0]);
  }

  private mapRow(row: any): WhatsAppTemplate {
    return {
      id: String(row.id),
      templateId: row.template_id,
      name: row.name,
      status: row.status,
      language: row.language,
      category: row.category ?? null,
      body: row.body,
      variables: Array.isArray(row.variables_json) ? row.variables_json : [],
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    };
  }
}
