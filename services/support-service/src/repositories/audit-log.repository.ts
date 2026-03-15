import { BaseRepository } from '@fs/shared';

export interface AuditLogEntry {
    id?: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: any;
    afterJson?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: Date;
}

export class AuditLogRepository extends BaseRepository {
    async insert(entry: AuditLogEntry): Promise<void> {
        const sql = `
            INSERT INTO admin_audit_logs (
                admin_id, action, entity_type, entity_id, before_json, after_json, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await this.query(sql, [
            entry.adminId,
            entry.action,
            entry.entityType,
            entry.entityId,
            entry.beforeJson ? JSON.stringify(entry.beforeJson) : null,
            entry.afterJson ? JSON.stringify(entry.afterJson) : null,
            entry.ipAddress || null,
            entry.userAgent || null
        ]);
    }
}
