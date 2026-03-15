import { Worker, Job } from 'bullmq';
import { getRedisClient, logger } from '@fs/shared';
import { BroadcastService } from '../services/BroadcastService';

export class BroadcastWorker {
  private worker: Worker;
  private service: BroadcastService;

  constructor() {
    const redis = getRedisClient();
    this.service = new BroadcastService();

    this.worker = new Worker(
      'broadcast_campaigns',
      async (job: Job) => {
        const { campaignId } = job.data as { campaignId: string };
        if (!campaignId) {
          logger.warn('Broadcast job missing campaignId');
          return;
        }
        await this.service.dispatchCampaign(campaignId);
      },
      { connection: redis as any }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Broadcast campaign job ${job.id} completed.`);
    });
    this.worker.on('failed', (job, err) => {
      logger.error(`Broadcast campaign job ${job?.id} failed`, err);
    });
  }

  async close() {
    await this.worker.close();
  }
}
