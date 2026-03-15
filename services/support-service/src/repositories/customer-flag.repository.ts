import { BaseRepository } from '@fs/shared';

export interface CustomerFlag {
  id: string;
  userId: string;
  flagType: 'VIP' | 'FRAUD';
  note: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerFlagRepository extends BaseRepository {
  async findActiveByUser(userId: string): Promise<CustomerFlag[]> {
    const { rows } = await this.query(
      `SELECT * FROM customer_flags WHERE user_id = $1 AND is_active = true ORDER BY updated_at DESC`,
      [userId]
    );
    return rows.map((row) => this.mapToCamelCase<CustomerFlag>(row));
  }

  async findActiveByUserAndType(userId: string, flagType: 'VIP' | 'FRAUD'): Promise<CustomerFlag | null> {
    const { rows } = await this.query(
      `SELECT * FROM customer_flags WHERE user_id = $1 AND flag_type = $2 AND is_active = true`,
      [userId, flagType]
    );
    return rows[0] ? this.mapToCamelCase<CustomerFlag>(rows[0]) : null;
  }

  async createFlag(userId: string, flagType: 'VIP' | 'FRAUD', note: string | null, adminId: string): Promise<CustomerFlag> {
    const { rows } = await this.query(
      `INSERT INTO customer_flags (user_id, flag_type, note, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, flagType, note, adminId, adminId]
    );
    return this.mapToCamelCase<CustomerFlag>(rows[0]);
  }

  async updateFlag(id: string, note: string | null, adminId: string): Promise<CustomerFlag> {
    const { rows } = await this.query(
      `UPDATE customer_flags
       SET note = $2,
           updated_by = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, note, adminId]
    );
    return this.mapToCamelCase<CustomerFlag>(rows[0]);
  }
}
