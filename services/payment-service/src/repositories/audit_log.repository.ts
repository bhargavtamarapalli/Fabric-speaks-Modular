import { getDbPool } from '@fs/shared/src/db';

export class AuditLogRepository {
  async insert(data: {
    admin_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    payload?: any;
  }) {
    await getDbPool().query(`
      INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, payload)
      VALUES ($1, $2, $3, $4, $5)
    `, [data.admin_id, data.action, data.resource_type, data.resource_id, data.payload]);
  }
}
