import { BaseRepository } from '@fs/shared';

export interface AuditLogDto {
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: any;
    afterJson?: any;
    ipAddress?: string;
}

export class AuditLogRepository extends BaseRepository {
    async insert(dto: Partial<AuditLogDto>): Promise<void> {
        await this.query(
            `INSERT INTO admin_audit_log 
            (admin_id, action, entity_type, entity_id, before_json, after_json, ip_address) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                dto.adminId, 
                dto.action, 
                dto.entityType, 
                dto.entityId, 
                dto.beforeJson || null, 
                dto.afterJson || null, 
                dto.ipAddress || null
            ]
        );
    }
}
