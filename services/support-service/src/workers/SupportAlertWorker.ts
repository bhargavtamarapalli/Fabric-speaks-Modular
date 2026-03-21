import { Worker, Job } from 'bullmq';
import { getDbPool, getRedisClient, logger } from '@fs/shared';
import { SupportRepository } from '../repositories/support.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { CustomerViewService } from '../services/customer-view.service';
import { CustomerFlagRepository } from '../repositories/customer-flag.repository';
import { SupportService } from '../services/support.service';
import { ReturnPickupFailedSchema } from '../schemas/alert.schemas';

export class SupportAlertWorker {
  private worker: Worker;
  private supportService: SupportService;

  constructor() {
    const redis = getRedisClient();
    const db = getDbPool();
    this.supportService = new SupportService(
      new SupportRepository(db),
      new AuditLogRepository(db),
      new CustomerViewService(db),
      new CustomerFlagRepository(db)
    );

    this.worker = new Worker(
      'platform_events',
      async (job: Job) => {
        if (job.name === 'return.pickup_failed') {
          const data = ReturnPickupFailedSchema.parse(job.data);
          await this.supportService.createPickupFailedAlert(data.orderId, data.returnId, data.reason);
        }
      },
      { connection: redis as any }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Support alert job ${job.id} completed.`);
    });
    this.worker.on('failed', (job, err) => {
      logger.error(`Support alert job ${job?.id} failed`, err);
    });
  }

  async close() {
    await this.worker.close();
  }
}
