import { BaseRepository } from '@fs/shared';
import { v4 as uuidv4 } from 'uuid';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
export type NotificationChannel = 'whatsapp' | 'sms' | 'email';

export interface NotificationLog {
  id: string;
  userId?: string;
  orderId?: string;
  eventType: string;
  recipient?: string | null;
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
      INSERT INTO notification_log 
        (id, user_id, order_id, event_type, recipient, channel, status, provider_response, template_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *;
    `;
    const values = [
      id,
      log.userId || null,
      log.orderId || null,
      log.eventType,
      log.recipient || null,
      log.channel,
      log.status,
      log.providerResponse ? JSON.stringify(log.providerResponse) : null,
      log.templateId || null,
    ];

    const result = await this.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    providerResponse?: Record<string, unknown>
  ): Promise<NotificationLog | null> {
    const query = `
      UPDATE notification_log 
      SET
        status = $1,
        provider_response = $2,
        error_code = COALESCE($4, error_code),
        wa_message_id = COALESCE($5, wa_message_id)
      WHERE id = $3 
      RETURNING *;
    `;
    const values = [
      status,
      providerResponse ? JSON.stringify(providerResponse) : null,
      id,
      providerResponse && 'error' in providerResponse ? String(providerResponse.error) : null,
      providerResponse && 'messages' in providerResponse && Array.isArray((providerResponse as any).messages)
        ? String((providerResponse as any).messages[0]?.id || '')
        : null,
    ];

    const result = await this.query(query, values);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: Record<string, unknown>): NotificationLog {
    const mapped = this.mapToCamelCase<any>(row);
    return {
      ...mapped,
      createdAt: mapped.sentAt ?? mapped.createdAt,
      channel: String(mapped.channel).toLowerCase() as NotificationChannel,
    };
  }
}
