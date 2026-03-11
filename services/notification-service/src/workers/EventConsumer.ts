import { Worker, Job } from 'bullmq';
import { getRedisClient } from '@fs/shared';
import { logger } from '@fs/shared';
import { NotificationCoordinator } from '../services/NotificationCoordinator';
import { LoyaltyScheduler } from './LoyaltyScheduler';

const QUEUE_NAME = 'platform_events';

export class EventConsumer {
  private worker: Worker;
  private coordinator: NotificationCoordinator;

  constructor() {
    this.coordinator = new NotificationCoordinator();
    const redis = getRedisClient();

    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        logger.info(`Processing event ${job.name} (Job ID: ${job.id})`);
        await this.handleEvent(job);
      },
      { connection: redis }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Event ${job.name} completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Event ${job?.name} failed:`, err);
    });
  }

  private async handleEvent(job: Job): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case 'order.created':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'order_confirmation',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.orderId }, { type: 'text', text: data.totalAmount }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Your order ${data.orderId} for Rs. ${data.totalAmount} is confirmed.`
        });
        break;

      case 'payment.captured':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'payment_confirmed',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.orderId }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Payment for order ${data.orderId} is successful.`
        });
        break;

      case 'payment.cod_confirmed':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'cod_confirmed',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.orderId }] }
          ],
          fallbackSmsBody: `Fabric Speaks: COD Order ${data.orderId} is confirmed.`
        });
        break;

      case 'order.shipped':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'order_shipped',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.orderId }, { type: 'text', text: data.awb }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Order ${data.orderId} shipped. AWB: ${data.awb}`
        });
        break;

      case 'return.requested':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'return_pickup',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.orderId }, { type: 'text', text: data.pickupDate }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Return for order ${data.orderId} is scheduled for ${data.pickupDate}.`
        });
        break;

      case 'return.refund_initiated':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'refund_initiated',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.orderId }, { type: 'text', text: data.days }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Refund for order ${data.orderId} initiated. Expect it in ${data.days} days.`
        });
        break;

      case 'stock.low':
        await this.coordinator.processNotification({
          eventType: name,
          recipientPhone: process.env.ADMIN_PHONE || '+910000000000',
          waTemplateName: 'admin_stock_alert',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.productName }, { type: 'text', text: data.stockCount }] }
          ],
          fallbackSmsBody: `ALERT: Stock low for ${data.productName} (${data.stockCount} units left).`
        });
        break;

      case 'order.delivered':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'delivery_confirmation',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.orderId }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Order ${data.orderId} is delivered. Enjoy your fabric!`
        });
        
        // Schedule loyalty triggers
        const scheduler = new LoyaltyScheduler();
        await scheduler.scheduleLoyaltySequence(data);
        break;

      case 'loyalty.day30':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'loyalty_day30',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.fabricType }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Loved your ${data.fabricType}? Check out our new arrivals matching your style!`
        });
        break;

      case 'loyalty.day45':
        await this.coordinator.processNotification({
          userId: data.userId,
          orderId: data.orderId,
          eventType: name,
          recipientPhone: data.customerPhone,
          waTemplateName: 'loyalty_day45',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: data.fabricType }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Our premium ${data.fabricType} collection is selling fast! Get yours before stock ends.`
        });
        break;

      default:
        logger.info(`Event ${name} is ignored by Notification Service.`);
    }
  }

  async close() {
    await this.worker.close();
  }
}
