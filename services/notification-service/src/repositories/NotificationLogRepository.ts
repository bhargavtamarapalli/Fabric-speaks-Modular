import { Pool } from 'pg';
import { getDbPool } from '@fs/shared';
import { v4 as uuidv4 } from 'uuid';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';

export interface NotificationLog {
  id: string;
  user_id?: string;
  order_id?: string;
  event_type: string;
  recipient: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider_response?: any;
  template_id?: string;
  created_at: Date;
}

export class NotificationLogRepository {
  private pool: Pool;

  constructor() {
    this.pool = getDbPool();
  }

  async createLog(
    log: Omit<NotificationLog, 'id' | 'created_at'>
  ): Promise<NotificationLog> {
    const id = uuidv4();
    const query = `
      INSERT INTO notification_logs 
        (id, user_id, order_id, event_type, recipient, channel, status, provider_response, template_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *;
    `;
    const values = [
      id,
      log.user_id || null,
      log.order_id || null,
      log.event_type,
      log.recipient,
      log.channel,
      log.status,
      log.provider_response ? JSON.stringify(log.provider_response) : null,
      log.template_id || null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    providerResponse?: any
  ): Promise<NotificationLog | null> {
    const query = `
      UPDATE notification_logs 
      SET status = $1, provider_response = $2 
      WHERE id = $3 
      RETURNING *;
    `;
    const values = [
      status,
      providerResponse ? JSON.stringify(providerResponse) : null,
      id,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }
}
