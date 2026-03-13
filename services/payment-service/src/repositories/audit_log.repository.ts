import { BaseRepository } from '@fs/shared';

export class AuditLogRepository extends BaseRepository {
  async insert(data: {
    admin_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    payload?: Record<string, unknown>;
  }) {
    await this.query(`
      INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, payload)
      VALUES ($1, $2, $3, $4, $5)
    `, [data.admin_id, data.action, data.resource_type, data.resource_id, data.payload]);
  }

    async logAction(adminId: string, action: string, details: Record<string, unknown>): Promise<void> {
        await this.query(
            'INSERT INTO payment_audit_logs (admin_id, action, details) VALUES ($1, $2, $3)',
            [adminId, action, JSON.stringify(details)]
        );
    }
}
