import { BaseRepository } from '@fs/shared';

export interface AuditLogInput {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export class AuditLogRepository extends BaseRepository {
  async insert(data: AuditLogInput): Promise<void> {
    await this.query(
      `
        INSERT INTO admin_audit_log (
          admin_id,
          action,
          entity_type,
          entity_id,
          before_json,
          after_json,
          ip_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        data.adminId,
        data.action,
        data.entityType,
        data.entityId,
        data.beforeJson ?? null,
        data.afterJson ?? null,
        data.ipAddress ?? null,
      ]
    );
  }
}
