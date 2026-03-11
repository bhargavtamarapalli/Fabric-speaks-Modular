import { getDbPool } from '@fs/shared';
import { v4 as uuidv4 } from 'uuid';

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'PICKUP_SCHEDULED' | 'RECEIVED' | 'RESOLVED_REFUNDED' | 'RESOLVED_REPLACED' | 'REJECTED';

export interface ReturnEntity {
  id: string;
  order_id: string;
  user_id: string;
  status: ReturnStatus;
  reason: string;
  pickup_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class ReturnRepository {
  async createReturn(orderId: string, userId: string, reason: string): Promise<ReturnEntity> {
    const pool = getDbPool();
    const id = uuidv4();
    const query = `
      INSERT INTO returns (id, order_id, user_id, reason, status)
      VALUES ($1, $2, $3, $4, 'REQUESTED')
      RETURNING *;
    `;
    const result = await pool.query(query, [id, orderId, userId, reason]);
    return result.rows[0];
  }

  async getReturnById(returnId: string): Promise<ReturnEntity | null> {
    const pool = getDbPool();
    const query = `SELECT * FROM returns WHERE id = $1;`;
    const result = await pool.query(query, [returnId]);
    return result.rows[0] || null;
  }

  async getReturns(
    filters?: { status?: ReturnStatus; userId?: string },
    limit = 50,
    offset = 0
  ): Promise<ReturnEntity[]> {
    const pool = getDbPool();
    let query = `SELECT * FROM returns WHERE 1=1`;
    const values: any[] = [];

    if (filters?.status) {
      values.push(filters.status);
      query += ` AND status = $${values.length}`;
    }

    if (filters?.userId) {
      values.push(filters.userId);
      query += ` AND user_id = $${values.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  async updateStatus(returnId: string, status: ReturnStatus): Promise<ReturnEntity> {
    const pool = getDbPool();
    const query = `
      UPDATE returns 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 
      RETURNING *;
    `;
    const result = await pool.query(query, [status, returnId]);
    return result.rows[0];
  }

  async setPickupDate(returnId: string, pickupDate: Date): Promise<ReturnEntity> {
    const pool = getDbPool();
    const query = `
      UPDATE returns 
      SET pickup_date = $1, status = 'PICKUP_SCHEDULED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 
      RETURNING *;
    `;
    const result = await pool.query(query, [pickupDate, returnId]);
    return result.rows[0];
  }
}
