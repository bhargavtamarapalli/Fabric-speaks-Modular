import { Worker, Job } from 'bullmq';
import { getRedisClient, logger } from '@fs/shared';
import { firebaseAuth } from '../lib/firebase';
import { env } from '../config/env';

export class UserSyncWorker {
  private worker: Worker;

  constructor() {
    const redis = getRedisClient();

    this.worker = new Worker(
      'platform_events', // We share the existing platform_events queue
      async (job: Job) => {
        if (job.name === 'user.sync_claims') {
          const { firebaseUid, role } = job.data as { firebaseUid: string; role: string | null };
          
          if (!firebaseUid) {
            logger.warn('[UserSyncWorker] Job missing firebaseUid', { jobId: job.id });
            return;
          }

          try {
            await firebaseAuth.setCustomUserClaims(firebaseUid, { role });
            
            if (env.APP_ENV === 'development') {
              logger.info(`[UserSyncWorker] Synced Firebase claims for UID ${firebaseUid}: role=${role}`);
            }
          } catch (error) {
            logger.error(`[UserSyncWorker] Failed to sync Firebase claims for UID ${firebaseUid}`, error);
            // BullMQ will handle retries based on the job configuration
            throw error; 
          }
        }
      },
      { 
        connection: redis as any,
        concurrency: 5 // Process up to 5 syncs in parallel
      }
    );

    this.worker.on('failed', (job, err) => {
      logger.error(`[UserSyncWorker] Job ${job?.id} failed after attempts`, err);
    });

    if (env.APP_ENV === 'development') {
      logger.info('[UserSyncWorker] Worker initialized and listening to platform_events queue');
    }
  }

  async close() {
    await this.worker.close();
  }
}
