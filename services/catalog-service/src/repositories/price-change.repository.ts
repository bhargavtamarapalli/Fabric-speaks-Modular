import { BaseRepository } from '@fs/shared';

export type PriceChangeStatus = 'scheduled' | 'processing' | 'applied' | 'failed' | 'cancelled';
export type PriceChangeTarget = 'product' | 'variant' | 'collection' | 'brand' | 'global';
export type PriceChangeApplyTo = 'base_price' | 'price_override';
export type PriceChangeAdjustmentType = 'PERCENT' | 'FIXED';

export interface ScheduledPriceChange {
  id: string;
  targetType: PriceChangeTarget;
  targetIds: string[];
  adjustmentType: PriceChangeAdjustmentType;
  adjustmentValue: number;
  applyTo: PriceChangeApplyTo;
  scheduledAt: Date;
  status: PriceChangeStatus;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  appliedAt: Date | null;
  errorMessage: string | null;
}

export class PriceChangeRepository extends BaseRepository {
  async create(change: Omit<ScheduledPriceChange, 'id' | 'createdAt' | 'updatedAt' | 'appliedAt' | 'errorMessage' | 'status'>): Promise<ScheduledPriceChange> {
    const query = `
      INSERT INTO scheduled_price_changes (
        target_type,
        target_ids,
        adjustment_type,
        adjustment_value,
        apply_to,
        scheduled_at,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
      RETURNING *
    `;
    const { rows } = await this.query(query, [
      change.targetType,
      JSON.stringify(change.targetIds ?? []),
      change.adjustmentType,
      change.adjustmentValue,
      change.applyTo,
      change.scheduledAt,
      change.createdBy
    ]);
    return this.mapRow(rows[0]);
  }

  async findById(id: string): Promise<ScheduledPriceChange | null> {
    const { rows } = await this.query('SELECT * FROM scheduled_price_changes WHERE id = $1', [id]);
    if (!rows.length) return null;
    return this.mapRow(rows[0]);
  }

  async list(filters: { status?: PriceChangeStatus; limit?: number; offset?: number }) {
    const params: unknown[] = [];
    let query = 'SELECT * FROM scheduled_price_changes WHERE 1=1';

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY scheduled_at DESC';

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

  async updateStatus(id: string, status: PriceChangeStatus, data: { appliedAt?: Date | null; errorMessage?: string | null } = {}): Promise<void> {
    const setClauses = ['status = $2', 'updated_at = now()'];
    const params = [id, status];

    // Only include applied_at in SET if explicitly provided
    if ('appliedAt' in data) {
      params.push(data.appliedAt);
      setClauses.push(`applied_at = $${params.length}`);
    }

    // Only include error_message in SET if explicitly provided
    if ('errorMessage' in data) {
      params.push(data.errorMessage);
      setClauses.push(`error_message = $${params.length}`);
    }

    const query = `
      UPDATE scheduled_price_changes
      SET ${setClauses.join(', ')}
      WHERE id = $1
    `;
    await this.query(query, params);
  }

  async markProcessing(id: string): Promise<void> {
    await this.updateStatus(id, 'processing');
  }

  private mapRow(row: any): ScheduledPriceChange {
    const mapped = this.mapToCamelCase<ScheduledPriceChange>(row);
    return {
      ...mapped,
      targetIds: Array.isArray(mapped.targetIds) ? mapped.targetIds : [],
      adjustmentValue: Number(mapped.adjustmentValue)
    };
  }
}
