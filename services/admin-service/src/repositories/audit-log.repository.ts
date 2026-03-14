import { BaseRepository } from '@fs/shared';

export interface AuditLog {
    id: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: any;
    afterJson?: any;
    ipAddress?: string;
    createdAt: Date;
}

export class AuditLogRepository extends BaseRepository {
    async list(filters: { adminId?: string; limit?: number; cursor?: string }): Promise<{ items: AuditLog[]; meta: any }> {
        let query = 'SELECT * FROM admin_audit_log WHERE 1=1';
        const params: any[] = [];
        
        if (filters.adminId) {
            params.push(filters.adminId);
            query += ` AND admin_id = $${params.length}`;
        }

        if (filters.cursor) {
            // Cursor format: 'timestamp|id'
            const [timestamp, id] = filters.cursor.split('|');
            params.push(timestamp, id);
            query += ` AND (created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`;
        }

        query += ' ORDER BY created_at DESC, id DESC';
        
        const limit = filters.limit || 50;
        params.push(limit);
        query += ` LIMIT $${params.length}`;

        const { rows } = await this.query(query, params);
        const items = rows.map(r => this.mapToCamelCase<AuditLog>(r));
        
        let nextCursor = null;
        if (items.length > 0) {
            const lastItem = items[items.length - 1];
            nextCursor = `${lastItem.createdAt.toISOString()}|${lastItem.id}`;
        }

        return {
            items,
            meta: { 
                count: items.length,
                nextCursor
            }
        };
    }

    async insert(data: Partial<AuditLog>): Promise<void> {
        const query = `
            INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, before_json, after_json, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await this.query(query, [
            data.adminId, 
            data.action, 
            data.entityType, 
            data.entityId, 
            data.beforeJson || null, 
            data.afterJson || null,
            data.ipAddress || null
        ]);
    }
}
