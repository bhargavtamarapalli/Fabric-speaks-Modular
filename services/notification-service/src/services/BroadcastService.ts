import { Queue } from 'bullmq';
import pLimit from 'p-limit';
import { AppError, ErrorCode, getDbPool, getRedisClient, logger } from '@fs/shared';
import { BroadcastCampaignRepository, BroadcastCampaign, CampaignStatus } from '../repositories/BroadcastCampaignRepository';
import { TemplateRepository } from '../repositories/TemplateRepository';
import { NotificationCoordinator } from './NotificationCoordinator';

export interface AudienceFilter {
  fabricTypes?: string[];
  minOrders?: number;
  lastOrderSinceDays?: number;
}

// Configurable concurrency limit for broadcast processing
const BROADCAST_CONCURRENCY_LIMIT = parseInt(process.env.BROADCAST_CONCURRENCY_LIMIT ?? '10', 10);

export class BroadcastService {
  private campaignRepo: BroadcastCampaignRepository;
  private templateRepo: TemplateRepository;
  private coordinator: NotificationCoordinator;
  private queue: Queue;

  constructor() {
    const db = getDbPool();
    this.campaignRepo = new BroadcastCampaignRepository(db);
    this.templateRepo = new TemplateRepository(db);
    this.coordinator = new NotificationCoordinator();
    this.queue = new Queue('broadcast_campaigns', { connection: getRedisClient() });
  }

  async estimateReach(filter: AudienceFilter) {
    const { rows } = await this.getRecipients(filter, true);
    return { estimatedRecipients: parseInt(rows[0]?.count ?? '0', 10) };
  }

  async createCampaign(input: {
    templateId: string;
    messagePreview: string;
    scheduledAt?: Date;
    templateComponents?: any[];
    channel?: string;
    audience: AudienceFilter;
    adminId: string;
  }) {
    const now = new Date();
    const scheduledAt = input.scheduledAt ?? null;
    if (scheduledAt) {
      // Convert to business timezone (IST: UTC+5:30) for hour validation
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata' // IST timezone for Indian business hours
      });
      const businessHour = parseInt(formatter.format(scheduledAt), 10);
      if (businessHour < 8 || businessHour >= 22) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Scheduled broadcasts must be between 8am and 10pm IST');
      }
    }
    const status: CampaignStatus =
      scheduledAt && scheduledAt.getTime() > now.getTime() ? 'scheduled' : 'sending';

    const campaign = await this.campaignRepo.create({
      templateId: input.templateId,
      audienceFilter: (input.audience as any) ?? {},
      messagePreview: input.messagePreview,
      scheduledAt,
      templateComponents: input.templateComponents ?? [],
      channel: input.channel ?? 'whatsapp',
      sentBy: input.adminId,
      status
    });

    await this.campaignRepo.ensureAnalyticsRow(campaign.id);

    const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;
    await this.queue.add('broadcast-campaign', { campaignId: campaign.id }, { delay });

    return campaign;
  }

  async listCampaigns(filters: { status?: CampaignStatus; limit?: number; offset?: number }) {
    return this.campaignRepo.list(filters);
  }

  async getCampaign(id: string) {
    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new AppError(ErrorCode.NOT_FOUND, 'Campaign not found');
    return campaign;
  }

  async listTemplates(filters: { status?: string; limit?: number; offset?: number }) {
    return this.templateRepo.list(filters as any);
  }

  async previewTemplate(templateId: string, variables: string[] = []) {
    const template = await this.templateRepo.findByTemplateId(templateId);
    if (!template) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Template not found');
    }

    let preview = template.body;
    variables.forEach((value, index) => {
      const placeholder = new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g');
      preview = preview.replace(placeholder, value);
    });

    return { templateId, preview };
  }

  async dispatchCampaign(campaignId: string) {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Campaign not found');
    }

    if (campaign.status === 'sent') {
      return { skipped: true, status: campaign.status };
    }

    await this.campaignRepo.updateStatus(campaignId, 'sending');

    const recipients = await this.getRecipients(campaign.audienceFilter as AudienceFilter, false);
    const rows = recipients.rows || [];

    // Create a concurrency-limited promise processor
    const limit = pLimit(BROADCAST_CONCURRENCY_LIMIT);

    // Process all rows in parallel with concurrency control
    // Return result objects instead of mutating shared counters (avoid race conditions)
    const results = await Promise.all(
      rows.map((row: any) =>
        limit(async () => {
          const phone = this.normalizePhone(row.mobile);
          if (!phone) {
            return { sent: false, skipped: true };
          }

          try {
            await this.coordinator.processNotification({
              eventType: 'campaign.broadcast',
              recipientPhone: phone,
              waTemplateName: campaign.templateId,
              waComponents: campaign.templateComponents,
              fallbackSmsBody: campaign.messagePreview
            });
            return { sent: true, skipped: false };
          } catch (error) {
            logger.error({ campaignId, error }, 'Failed to send broadcast message');
            return { sent: false, skipped: true };
          }
        })
      )
    );

    // Count results after all promises complete (no race condition)
    const sent = results.filter((r: any) => r.sent).length;
    const skipped = results.filter((r: any) => r.skipped).length;

    await this.campaignRepo.updateAnalytics(campaignId, { sent, capped: skipped });
    await this.campaignRepo.updateStatus(campaignId, 'sent', new Date());

    return { sent, skipped };
  }

  private normalizePhone(mobile?: string | null) {
    if (!mobile) return null;
    const digits = mobile.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    return mobile;
  }

  private async getRecipients(filter: AudienceFilter, countOnly: boolean) {
    const params: any[] = [];
    const conditions: string[] = [
      `u.is_deleted = false`,
      `u.role = 'customer'`,
      `u.mobile IS NOT NULL`,
      `EXISTS (SELECT 1 FROM consent_log cl WHERE cl.user_id = u.id AND cl.channel = 'whatsapp' AND cl.opted_out_at IS NULL)`
    ];

    if (filter?.fabricTypes && filter.fabricTypes.length > 0) {
      params.push(filter.fabricTypes);
      conditions.push(`pf.fabric_type = ANY($${params.length})`);
    }

    if (filter?.minOrders) {
      params.push(filter.minOrders);
      conditions.push(`COALESCE(os.orders_count, 0) >= $${params.length}`);
    }

    if (filter?.lastOrderSinceDays) {
      params.push(filter.lastOrderSinceDays);
      conditions.push(`os.last_order_at >= now() - interval '1 day' * $${params.length}`);
    }

    const selectClause = countOnly ? 'COUNT(*) as count' : 'u.id, u.mobile';

    const query = `
      WITH order_stats AS (
        SELECT o.user_id, COUNT(*) as orders_count, MAX(o.created_at) as last_order_at
        FROM orders o
        WHERE o.user_id IS NOT NULL
        GROUP BY o.user_id
      ),
      preferred_fabric AS (
        SELECT
          o.user_id,
          p.attributes->>'fabric_type' as fabric_type,
          SUM(oi.quantity) as units,
          ROW_NUMBER() OVER (PARTITION BY o.user_id ORDER BY SUM(oi.quantity) DESC) as rn
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE o.user_id IS NOT NULL
        GROUP BY o.user_id, p.attributes->>'fabric_type'
      )
      SELECT ${selectClause}
      FROM users u
      LEFT JOIN order_stats os ON os.user_id = u.id
      LEFT JOIN preferred_fabric pf ON pf.user_id = u.id AND pf.rn = 1
      WHERE ${conditions.join(' AND ')}
    `;

    const db = getDbPool();
    return db.query(query, params);
  }
}
