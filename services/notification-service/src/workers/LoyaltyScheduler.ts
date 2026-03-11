import { Queue } from 'bullmq';
import { getRedisClient } from '@fs/shared';
import { logger } from '@fs/shared';

const QUEUE_NAME = 'platform_events';

export class LoyaltyScheduler {
  private queue: Queue;

  constructor() {
    const redis = getRedisClient();
    this.queue = new Queue(QUEUE_NAME, { connection: redis });
  }

  async scheduleLoyaltySequence(orderData: any) {
    const { userId, orderId, customerPhone, fabricType } = orderData;
    
    if (!userId || !customerPhone || !fabricType) {
      logger.warn(`Missing required data to schedule loyalty for order ${orderId}`);
      return;
    }

    const DAY_IN_MS = 24 * 60 * 60 * 1000;

    await this.queue.add(
      'user.update_profile',
      { userId, attributes: { fabric_type: fabricType } },
      { removeOnComplete: true }
    );
    logger.info(`Scheduled user.update_profile for user ${userId}`);

    await this.queue.add(
      'loyalty.day30',
      { userId, orderId, customerPhone, fabricType },
      { delay: 30 * DAY_IN_MS, removeOnComplete: true }
    );
    logger.info(`Scheduled loyalty.day30 for order ${orderId} (30 days delay)`);

    await this.queue.add(
      'loyalty.day45',
      { userId, orderId, customerPhone, fabricType },
      { delay: 45 * DAY_IN_MS, removeOnComplete: true }
    );
    logger.info(`Scheduled loyalty.day45 for order ${orderId} (45 days delay)`);
  }
}
