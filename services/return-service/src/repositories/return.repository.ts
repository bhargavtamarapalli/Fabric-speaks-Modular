import { BaseRepository } from '@fs/shared';

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKUP_SCHEDULED' | 'PICKED_UP' | 'INSPECTED' | 'COMPLETED' | 'FAST_TRACKED';
export type ReturnType = 'WRONG_ITEM' | 'DAMAGED' | 'SIZE_EXCHANGE' | 'CHANGED_MIND' | 'OTHER';

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

    async updateStatus(id: string, status: ReturnStatus): Promise<ReturnRequest> {
        const query = 'UPDATE return_requests SET status = $2, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, status]);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRequest>(rows[0]);
    }

    async setShiprocketId(id: string, shiprocketId: string): Promise<ReturnRequest> {
        const query = 'UPDATE return_requests SET shiprocket_return_id = $2, status = $3, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, shiprocketId, 'PICKUP_SCHEDULED']);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRequest>(rows[0]);
    }

    async resolve(id: string, resolution: { status: ReturnStatus, resolvedAt: Date, replacementOrderId?: string }): Promise<ReturnRequest> {
        const query = `
            UPDATE return_requests 
            SET status = $2, resolved_at = $3, replacement_order_id = $4, updated_at = now() 
            WHERE id = $1 
            RETURNING *
        `;
        const { rows } = await this.query(query, [id, resolution.status, resolution.resolvedAt, resolution.replacementOrderId]);
        if (!rows.length) throw new Error('Return not found');
        return this.mapToCamelCase<ReturnRequest>(rows[0]);
    }
}
