import { Queue } from 'bullmq';
import { AppError, ErrorCode, getRedisClient } from '@fs/shared';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { PriceChangeRepository, ScheduledPriceChange } from '../repositories/price-change.repository';
import { VariantRepository } from '../repositories/variant.repository';

export class PriceChangeService {
  constructor(
    private readonly priceChangeRepo: PriceChangeRepository,
    private readonly variantRepo: VariantRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly queue: Queue
  ) {}

  async schedulePriceChange(change: Omit<ScheduledPriceChange, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'appliedAt' | 'errorMessage'>, adminId: string) {
    const scheduled = await this.priceChangeRepo.create({
      ...change,
      createdBy: adminId
    });

    const delay = Math.max(0, scheduled.scheduledAt.getTime() - Date.now());
    await this.queue.add('scheduled-price-change', { priceChangeId: scheduled.id }, { delay });

    await this.auditLogRepo.insert({
      adminId,
      action: 'pricing.schedule_change',
      entityType: 'scheduled_price_change',
      entityId: scheduled.id,
      afterJson: {
        targetType: scheduled.targetType,
        targetIds: scheduled.targetIds,
        adjustmentType: scheduled.adjustmentType,
        adjustmentValue: scheduled.adjustmentValue,
        applyTo: scheduled.applyTo,
        scheduledAt: scheduled.scheduledAt
      }
    });

    return scheduled;
  }

  async listScheduled(filters: any) {
    return this.priceChangeRepo.list(filters);
  }

  async applyScheduledChange(priceChangeId: string) {
    const priceChange = await this.priceChangeRepo.findById(priceChangeId);
    if (!priceChange) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Scheduled price change not found');
    }

    if (priceChange.status !== 'scheduled' && priceChange.status !== 'processing') {
      return { skipped: true, status: priceChange.status };
    }

    await this.priceChangeRepo.markProcessing(priceChangeId);

    try {
      const updatedCount = await this.variantRepo.bulkAdjustPrices({
        targetType: priceChange.targetType,
        targetIds: priceChange.targetIds,
        adjustmentType: priceChange.adjustmentType,
        adjustmentValue: priceChange.adjustmentValue,
        applyTo: priceChange.applyTo
      });

      await this.priceChangeRepo.updateStatus(priceChangeId, 'applied', { appliedAt: new Date(), errorMessage: null });
      await this.clearCatalogCache();

      return { updatedCount };
    } catch (error: any) {
      await this.priceChangeRepo.updateStatus(priceChangeId, 'failed', { errorMessage: error?.message ?? 'Unknown error' });
      throw error;
    }
  }

  private async clearCatalogCache(): Promise<void> {
    const redis = getRedisClient();
    const listKeys = await redis.keys('catalog:list:*');
    if (listKeys.length > 0) {
      await redis.del(...listKeys);
    }
  }
}
