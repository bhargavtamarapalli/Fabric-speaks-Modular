import { Queue } from 'bullmq';
import { getRedisClient } from '@fs/shared';
import { logger } from '@fs/shared';

const QUEUE_NAME = 'platform_events';

export class LoyaltyScheduler {
  private queue: Queue;

  constructor() {
    const redis = getRedisClient();
    this.queue = new Queue(QUEUE_NAME, { connection: redis as any });
  }

  async scheduleLoyaltySequence(orderData: { userId: string; orderId: string; customerPhone: string; fabricType?: string }) {
    const { userId, orderId, customerPhone, fabricType } = orderData;
    
    if (!userId || !orderId || !customerPhone || !fabricType) {
      logger.warn(`Missing required data to schedule loyalty for order ${orderId}`);
      return;
    }

    const DAY_IN_MS = 24 * 60 * 60 * 1000;

    // Use jobId to prevent duplicate processing of the same order.delivered event
    // Added 10s delay to avoid immediate conflicts with order.delivered processing
    await this.queue.add(
      'user.update_profile',
      { userId, attributes: { fabric_type: fabricType } },
      { 
        jobId: `update-profile-${orderId}`,
        delay: 10000, 
        removeOnComplete: true 
      }
    );
    logger.info(`Scheduled user.update_profile for user ${userId} with 10s delay`);

    await this.queue.add(
      'loyalty.day30',
      { userId, orderId, customerPhone, fabricType },
      { 
        jobId: `loyalty-day30-${orderId}`,
        delay: 30 * DAY_IN_MS, 
        removeOnComplete: true 
      }
    );
    logger.info(`Scheduled loyalty.day30 for order ${orderId} (30 days delay)`);

    await this.queue.add(
      'loyalty.day45',
      { userId, orderId, customerPhone, fabricType },
      { 
        jobId: `loyalty-day45-${orderId}`,
        delay: 45 * DAY_IN_MS, 
        removeOnComplete: true 
      }
    );
    logger.info(`Scheduled loyalty.day45 for order ${orderId} (45 days delay)`);
  }

  async close() {
    await this.queue.close();
  }
}
