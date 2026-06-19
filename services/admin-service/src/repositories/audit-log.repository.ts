import { BaseRepository, AppError, ErrorCode } from '@fs/shared';

export interface AuditLog {
    id: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: Record<string, unknown> | null;
    afterJson?: Record<string, unknown> | null;
    ipAddress?: string | null;
    createdAt: Date;
}

export interface AuditLogFilters {
    adminId?: string;
    limit?: number;
    cursor?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
}

export class AuditLogRepository extends BaseRepository {
    async list(filters: AuditLogFilters): Promise<{ items: AuditLog[]; meta: { count: number; nextCursor: string | null } }> {
        let query = 'SELECT * FROM admin_audit_log WHERE 1=1';
        const params: unknown[] = [];
        
        if (filters.adminId) {
            params.push(filters.adminId);
            query += ` AND admin_id = $${params.length}`;
        }

        if (filters.action) {
            params.push(filters.action);
            query += ` AND action = $${params.length}`;
        }

        if (filters.entityType) {
            params.push(filters.entityType);
            query += ` AND entity_type = $${params.length}`;
        }

        if (filters.entityId) {
            params.push(filters.entityId);
            query += ` AND entity_id = $${params.length}`;
        }

        if (filters.cursor) {
            const parts = filters.cursor.split('|');
            if (parts.length !== 2) {
                throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid cursor format');
            }
            const [timestampStr, id] = parts;
            if (!timestampStr || isNaN(Date.parse(timestampStr))) {
                throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid cursor timestamp');
            }
            params.push(timestampStr, id);
            query += ` AND (created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`;
        }

        query += ' ORDER BY created_at DESC, id DESC';
        
        const limit = filters.limit || 50;
        params.push(limit);
        query += ` LIMIT $${params.length}`;

        const { rows } = await this.query(query, params);
        const items = rows.map(r => this.mapToCamelCase<AuditLog>(r));
        
        let nextCursor = null;
        if (items.length > 0 && items.length >= limit) {
            const lastItem = items[items.length - 1];
            if (lastItem) {
                nextCursor = `${lastItem.createdAt.toISOString()}|${lastItem.id}`;
            }
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
