import { BaseRepository } from '@fs/shared';
import { v4 as uuidv4 } from 'uuid';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';

export interface NotificationLog {
  id: string;
  userId?: string;
  orderId?: string;
  eventType: string;
  recipient: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerResponse?: Record<string, unknown>;
  templateId?: string;
  createdAt: Date;
}

export class NotificationLogRepository extends BaseRepository {
  async createLog(
    log: Omit<NotificationLog, 'id' | 'createdAt'>
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
      log.userId || null,
      log.orderId || null,
      log.eventType,
      log.recipient,
      log.channel,
      log.status,
      log.providerResponse ? JSON.stringify(log.providerResponse) : null,
      log.templateId || null,
    ];

    const result = await this.query(query, values);
    return this.mapToCamelCase<NotificationLog>(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    providerResponse?: Record<string, unknown>
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

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToCamelCase<NotificationLog>(result.rows[0]) : null;
  }
}
