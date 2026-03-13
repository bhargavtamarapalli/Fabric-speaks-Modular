import { BaseRepository } from '@fs/shared';

export type ReturnStatus = 'INITIATED' | 'APPROVED' | 'REJECTED' | 'PICKUP_SCHEDULED' | 'RECEIVED' | 'RESOLVED_REFUNDED' | 'RESOLVED_REPLACED';

export interface ReturnRecord {
    id: string;
    orderId: string;
    userId: string;
    status: ReturnStatus;
    reason: string;
    refundAmount: number;
    pickupDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class ReturnRepository extends BaseRepository {
    async findById(id: string): Promise<ReturnRecord | null> {
        const { rows } = await this.query('SELECT * FROM returns WHERE id = $1', [id]);
        if (!rows.length) return null;
        return this.mapToCamelCase<ReturnRecord>(rows[0]);
    }

    async create(data: Partial<ReturnRecord>): Promise<ReturnRecord> {
        const query = `
            INSERT INTO returns (order_id, user_id, status, reason, refund_amount)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const { rows } = await this.query(query, [data.orderId, data.userId, data.status, data.reason, data.refundAmount]);
        return this.mapToCamelCase<ReturnRecord>(rows[0]);
    }

    async getReturns(filter: { status?: string; userId?: string }): Promise<ReturnRecord[]> {
        let query = 'SELECT * FROM returns WHERE 1=1';
        const params: any[] = [];
        if (filter.status) {
            params.push(filter.status);
            query += ` AND status = $${params.length}`;
        }
        if (filter.userId) {
            params.push(filter.userId);
            query += ` AND user_id = $${params.length}`;
        }
        query += ' ORDER BY created_at DESC';
        const { rows } = await this.query(query, params);
        return rows.map(r => this.mapToCamelCase<ReturnRecord>(r));
    }

    async updateStatus(id: string, status: ReturnStatus): Promise<ReturnRecord> {
        const query = 'UPDATE returns SET status = $2, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, status]);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRecord>(rows[0]);
    }

    async setPickupDate(id: string, pickupDate: Date): Promise<ReturnRecord> {
        const query = 'UPDATE returns SET pickup_date = $2, status = $3, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, pickupDate, 'PICKUP_SCHEDULED']);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRecord>(rows[0]);
    }
}
