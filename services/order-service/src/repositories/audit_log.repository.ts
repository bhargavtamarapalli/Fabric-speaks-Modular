import { BaseRepository } from '@fs/shared';

export interface OrderAuditLogDto {
  adminId?: string;  // optional for system-generated status changes
  action: string;    // e.g. 'ORDER_STATUS_CHANGED', 'ORDER_PUSHED_TO_SHIPROCKET'
  entityType: string; // 'ORDER'
  entityId: string;   // orderId
  beforeJson?: any;   // previous state
  afterJson?: any;    // new state
  ipAddress?: string;
}

export class AuditLogRepository extends BaseRepository {
  /**
   * Insert audit log entry for order changes
   * Follows the same pattern as admin_audit_log table used across services
   */
  async insert(dto: Partial<OrderAuditLogDto>): Promise<void> {
    await this.query(
      `INSERT INTO admin_audit_log 
      (admin_id, action, entity_type, entity_id, before_json, after_json, ip_address) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        dto.adminId || null,
        dto.action,
        dto.entityType || 'ORDER',
        dto.entityId,
        dto.beforeJson ? JSON.stringify(dto.beforeJson) : null,
        dto.afterJson ? JSON.stringify(dto.afterJson) : null,
        dto.ipAddress || null
      ]
    );
  }
}
