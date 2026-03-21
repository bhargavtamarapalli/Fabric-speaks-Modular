import { BaseRepository } from '@fs/shared';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface BroadcastCampaign {
  id: string;
  templateId: string;
  audienceFilter: Record<string, unknown>;
  messagePreview: string;
  templateComponents: any[];
  scheduledAt: Date | null;
  sentAt: Date | null;
  status: CampaignStatus;
  sentBy: string;
  channel: string;
  createdAt: Date;
}

export class BroadcastCampaignRepository extends BaseRepository {
  async create(data: Omit<BroadcastCampaign, 'id' | 'sentAt' | 'createdAt' | 'status'> & { status: CampaignStatus }) {
    const query = `
      INSERT INTO broadcast_campaigns (
        template_id,
        audience_filter_json,
        message_preview,
        scheduled_at,
        status,
        sent_by,
        template_components,
        channel
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const { rows } = await this.query(query, [
      data.templateId,
      JSON.stringify(data.audienceFilter ?? {}),
      data.messagePreview,
      data.scheduledAt,
      data.status,
      data.sentBy,
      JSON.stringify(data.templateComponents ?? []),
      data.channel ?? 'whatsapp'
    ]);
    return this.mapRow(rows[0]);
  }

  async list(filters: { status?: CampaignStatus; limit?: number; offset?: number }) {
    const params: unknown[] = [];
    let query = 'SELECT * FROM broadcast_campaigns WHERE 1=1';
    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';

    // FIX: Use parameterized placeholders ($N) instead of interpolating values directly
    // This prevents SQL injection vulnerabilities when limit/offset come from user input
    if (filters.limit !== undefined) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }
    if (filters.offset !== undefined) {
      params.push(filters.offset);
      query += ` OFFSET $${params.length}`;
    }

    const { rows } = await this.query(query, params);
    return rows.map((row) => this.mapRow(row));
  }

  async findById(id: string): Promise<BroadcastCampaign | null> {
    const { rows } = await this.query('SELECT * FROM broadcast_campaigns WHERE id = $1', [id]);
    if (!rows.length) return null;
    return this.mapRow(rows[0]);
  }

  async updateStatus(id: string, status: CampaignStatus, sentAt?: Date | null): Promise<void> {
    const query = `
      UPDATE broadcast_campaigns
      SET status = $2,
          sent_at = COALESCE($3, sent_at)
      WHERE id = $1
    `;
    await this.query(query, [id, status, sentAt ?? null]);
  }

  async ensureAnalyticsRow(campaignId: string): Promise<void> {
    await this.query(
      `INSERT INTO broadcast_analytics (campaign_id)
       VALUES ($1)
       ON CONFLICT (campaign_id) DO NOTHING`,
      [campaignId]
    );
  }

  async updateAnalytics(campaignId: string, data: { sent?: number; delivered?: number; read?: number; clicked?: number; converted?: number; capped?: number }): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [campaignId];

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined) return;
      params.push(value);
      sets.push(`${key} = ${key} + $${params.length}`);
    });

    if (sets.length === 0) return;

    const query = `
      UPDATE broadcast_analytics
      SET ${sets.join(', ')},
          last_updated = now()
      WHERE campaign_id = $1
    `;
    await this.query(query, params);
  }

  private mapRow(row: unknown): BroadcastCampaign {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      templateId: String(r.template_id),
      audienceFilter: (r.audience_filter_json as Record<string, unknown>) ?? {},
      messagePreview: String(r.message_preview ?? ''),
      templateComponents: (r.template_components as unknown[]) ?? [],
      scheduledAt: r.scheduled_at ? new Date(r.scheduled_at as string) : null,
      sentAt: r.sent_at ? new Date(r.sent_at as string) : null,
      status: String(r.status) as CampaignStatus,
      sentBy: String(r.sent_by),
      channel: String(r.channel ?? 'whatsapp'),
      createdAt: r.created_at ? new Date(r.created_at as string) : new Date()
    };
  }
}
