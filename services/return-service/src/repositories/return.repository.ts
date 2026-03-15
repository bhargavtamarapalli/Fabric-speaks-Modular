import { BaseRepository, DbClient } from '@fs/shared';

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKUP_SCHEDULED' | 'PICKED_UP' | 'INSPECTED' | 'COMPLETED' | 'FAST_TRACKED';
export type ReturnType = 'WRONG_ITEM' | 'DAMAGED' | 'SIZE_EXCHANGE' | 'CHANGED_MIND' | 'OTHER';
export type ReturnActorType = 'customer' | 'admin' | 'courier' | 'system';

export interface ReturnItem {
    id: string;
    returnRequestId: string;
    orderItemId: string;
    variantId: string;
    quantity: number;
    refundAmount: number | null;
    inspectionResult: string | null;
    createdAt: Date;
}

export interface ReturnTimelineEvent {
    id: string;
    returnId: string;
    status: ReturnStatus;
    previousStatus: ReturnStatus | null;
    actorType: ReturnActorType;
    actorId: string | null;
    note: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}

export interface ReplacementOrderSummary {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: Date;
}

export interface ReturnOrderSummary {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: Date;
}

export interface ReturnRequest {
    id: string;
    orderId: string;
    userId: string;
    returnType: ReturnType;
    status: ReturnStatus;
    isFastTrack: boolean;
    replacementOrderId: string | null;
    shiprocketReturnId: string | null;
    resolvedAt: Date | null;
    agentNotes: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    items?: ReturnItem[];
}

export class ReturnRepository extends BaseRepository {
    async findById(id: string): Promise<ReturnRequest | null> {
        const { rows } = await this.query('SELECT * FROM return_requests WHERE id = $1 AND is_deleted = false', [id]);
        if (!rows.length) return null;
        
        const request = this.mapToCamelCase<ReturnRequest>(rows[0]);
        request.items = await this.getItemsByRequestId(id);
        
        return request;
    }

    async getItemsByRequestId(requestId: string): Promise<ReturnItem[]> {
        const { rows } = await this.query('SELECT * FROM return_items WHERE return_request_id = $1', [requestId]);
        return rows.map(r => this.mapToCamelCase<ReturnItem>(r));
    }

    async create(data: Partial<ReturnRequest>, items: Partial<ReturnItem>[]): Promise<ReturnRequest> {
        return this.withTransaction(async (client) => {
            const query = `
                INSERT INTO return_requests (order_id, user_id, return_type, status, is_fast_track)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const { rows } = await client.query(query, [
                data.orderId, 
                data.userId, 
                data.returnType, 
                data.status || 'REQUESTED', 
                data.isFastTrack || false
            ]);
            
            const newRequest = this.mapToCamelCase<ReturnRequest>(rows[0]);
            
            const itemPromises = items.map(item => {
                return client.query(
                    `INSERT INTO return_items (return_request_id, order_item_id, variant_id, quantity, refund_amount)
                     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [newRequest.id, item.orderItemId, item.variantId, item.quantity, item.refundAmount]
                );
            });
            
            const itemResults = await Promise.all(itemPromises);
            newRequest.items = itemResults.map(res => this.mapToCamelCase<ReturnItem>(res.rows[0]));
            
            return newRequest;
        });
    }

    async insertStatusHistory(
        returnId: string,
        status: ReturnStatus,
        previousStatus: ReturnStatus | null,
        actorType: ReturnActorType,
        actorId?: string | null,
        note?: string | null,
        metadata?: Record<string, unknown> | null,
        client?: DbClient
    ): Promise<void> {
        const db = client || this.db;
        await db.query(
            `INSERT INTO return_status_history
             (return_id, status, previous_status, actor_type, actor_id, note, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [returnId, status, previousStatus, actorType, actorId || null, note || null, metadata || null]
        );
    }

    async getTimeline(returnId: string): Promise<ReturnTimelineEvent[]> {
        const { rows } = await this.query(
            `SELECT *
             FROM return_status_history
             WHERE return_id = $1
             ORDER BY created_at ASC`,
            [returnId]
        );

        return rows.map((row) => this.mapToCamelCase<ReturnTimelineEvent>(row));
    }

    async getReturns(filter: { status?: string; userId?: string }): Promise<ReturnRequest[]> {
        let query = 'SELECT * FROM return_requests WHERE is_deleted = false';
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
        return rows.map(r => this.mapToCamelCase<ReturnRequest>(r));
    }

    async updateStatus(id: string, status: ReturnStatus, agentNotes?: string): Promise<ReturnRequest> {
        const query = `
            UPDATE return_requests 
            SET status = $2, agent_notes = COALESCE($3, agent_notes), updated_at = now() 
            WHERE id = $1 
            RETURNING *
        `;
        const { rows } = await this.query(query, [id, status, agentNotes || null]);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRequest>(rows[0]);
    }

    async setShiprocketId(id: string, shiprocketId: string, client?: any): Promise<ReturnRequest> {
        const query = 'UPDATE return_requests SET shiprocket_return_id = $2, status = $3, updated_at = now() WHERE id = $1 RETURNING *';
        const db = client || this.db;
        const { rows } = await db.query(query, [id, shiprocketId, 'PICKUP_SCHEDULED']);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRequest>(rows[0]);
    }

    async resolve(id: string, resolution: { status: ReturnStatus, resolvedAt: Date, replacementOrderId?: string }, client?: any): Promise<ReturnRequest> {
        const query = `
            UPDATE return_requests 
            SET status = $2, resolved_at = $3, replacement_order_id = $4, updated_at = now() 
            WHERE id = $1 
            RETURNING *
        `;
        const db = client || this.db;
        const { rows } = await db.query(query, [id, resolution.status, resolution.resolvedAt, resolution.replacementOrderId]);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRequest>(rows[0]);
    }

    async getReplacementOrderSummary(returnId: string): Promise<ReplacementOrderSummary | null> {
        const { rows } = await this.query(
            `SELECT
                o.id,
                o.id::text AS order_number,
                o.status,
                o.created_at
             FROM return_requests rr
             JOIN orders o ON o.id = rr.replacement_order_id
             WHERE rr.id = $1`,
            [returnId]
        );

        return rows[0] ? this.mapToCamelCase<ReplacementOrderSummary>(rows[0]) : null;
    }

    async getOriginalOrderSummary(returnId: string): Promise<ReturnOrderSummary | null> {
        const { rows } = await this.query(
            `SELECT
                o.id,
                o.id::text AS order_number,
                o.status,
                o.created_at
             FROM return_requests rr
             JOIN orders o ON o.id = rr.order_id
             WHERE rr.id = $1`,
            [returnId]
        );

        return rows[0] ? this.mapToCamelCase<ReturnOrderSummary>(rows[0]) : null;
    }
}
