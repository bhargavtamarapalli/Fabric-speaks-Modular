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
    async list(filters: any): Promise<{ items: AuditLog[]; meta: any }> {
        let query = 'SELECT * FROM admin_audit_logs WHERE 1=1';
        const params: any[] = [];
        if (filters.adminId) {
            params.push(filters.adminId);
            query += ` AND admin_id = $${params.length}`;
        }
        query += ' ORDER BY created_at DESC';
        const { rows } = await this.query(query, params);
        return {
            items: rows.map(r => this.mapToCamelCase<AuditLog>(r)),
            meta: { total: rows.length }
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
