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
  async insert(data: Partial<AuditLog>): Promise<void> {
    const query = `
      INSERT INTO admin_audit_log 
        (admin_id, action, entity_type, entity_id, before_json, after_json, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await this.query(query, [
      data.adminId,
      data.action,
      data.entityType,
      data.entityId,
      data.beforeJson || null,
      data.afterJson || null,
      data.ipAddress || null,
    ]);
  }
}
