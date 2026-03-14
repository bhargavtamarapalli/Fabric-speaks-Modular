import { BaseRepository } from '@fs/shared';

export interface AuditLog {
    id: string;
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    payload: any;
    createdAt: Date;
}

export class AuditLogRepository extends BaseRepository {
    async list(filters: { adminId?: string; limit?: number; cursor?: string }): Promise<{ items: AuditLog[]; meta: any }> {
        let query = 'SELECT * FROM admin_audit_logs WHERE 1=1';
        const params: any[] = [];
        
        if (filters.adminId) {
            params.push(filters.adminId);
            query += ` AND admin_id = $${params.length}`;
        }

        if (filters.cursor) {
            params.push(filters.cursor);
            query += ` AND id < $${params.length}`; // Simple ID-based cursor for descending order
        }

        query += ' ORDER BY id DESC';
        
        const limit = filters.limit || 50;
        params.push(limit);
        query += ` LIMIT $${params.length}`;

        const { rows } = await this.query(query, params);
        const items = rows.map(r => this.mapToCamelCase<AuditLog>(r));
        
        return {
            items,
            meta: { 
                count: items.length,
                nextCursor: items.length > 0 ? items[items.length - 1].id : null
            }
        };
    }

    async insert(data: any): Promise<void> {
        const query = `
            INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, payload)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await this.query(query, [data.adminId, data.action, data.targetType, data.targetId, data.payload]);
    }
}
