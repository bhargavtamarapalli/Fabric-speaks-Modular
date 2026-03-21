import { Worker, Job, Queue } from 'bullmq';
import { getDbPool, getRedisClient, logger } from '@fs/shared';
import { PriceChangeRepository } from '../repositories/price-change.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { PriceChangeService } from '../services/price-change.service';

export class PriceChangeWorker {
  private worker: Worker;
  private queue: Queue;

  constructor() {
    const redis = getRedisClient();
    const db = getDbPool();
    this.queue = new Queue('price_changes', { connection: redis });
    const service = new PriceChangeService(
      new PriceChangeRepository(db),
      new VariantRepository(db),
      new AuditLogRepository(db),
      this.queue
    );

    this.worker = new Worker(
      'price_changes',
      async (job: Job) => {
        const { priceChangeId } = job.data as { priceChangeId: string };
        if (!priceChangeId) {
          logger.warn('Price change job missing priceChangeId');
          return;
        }
        await service.applyScheduledChange(priceChangeId);
      },
      { connection: redis as any }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Price change job ${job.id} completed.`);
    });
    this.worker.on('failed', (job, err) => {
      logger.error(`Price change job ${job?.id} failed`, err);
    });
  }

  async close() {
    await this.worker.close();
    await this.queue.close();
  }
}
