import { Worker, Job } from 'bullmq';
import { getRedisClient } from '@fs/shared';
import { logger } from '@fs/shared';
import { NotificationCoordinator } from '../services/NotificationCoordinator';
import { LoyaltyScheduler } from './LoyaltyScheduler';
import { env } from '../config/env';
import { OrderEventSchema, StockEventSchema, ReturnEventSchema } from '../schemas/notification.schemas';

const QUEUE_NAME = 'platform_events';

export class EventConsumer {
  private worker: Worker;
  private coordinator: NotificationCoordinator;
  private scheduler: LoyaltyScheduler;

  constructor() {
    this.coordinator = new NotificationCoordinator();
    this.scheduler = new LoyaltyScheduler();
    const redis = getRedisClient();

    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        logger.info(`Processing event ${job.name} (Job ID: ${job.id})`);
        try {
          await this.handleEvent(job);
        } catch (error) {
          logger.error(`Failed to process event ${job.name}:`, error);
          throw error; // Re-throw to let BullMQ handle retries if configured
        }
      },
      { connection: redis as any }
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
      case 'order.created': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'order_confirmation',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: validatedData.totalAmount || '0' }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Your order ${validatedData.orderId} for Rs. ${validatedData.totalAmount} is confirmed.`
        });
        break;
      }

      case 'payment.captured': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'payment_confirmed',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Payment for order ${validatedData.orderId} is successful.`
        });
        break;
      }

      case 'payment.cod_confirmed': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'cod_confirmed',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
          ],
          fallbackSmsBody: `Fabric Speaks: COD Order ${validatedData.orderId} is confirmed.`
        });
        break;
      }

      case 'order.shipped': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'order_shipped',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: validatedData.awb || 'N/A' }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Order ${validatedData.orderId} shipped. AWB: ${validatedData.awb}`
        });
        break;
      }

      case 'return.requested': {
        const validatedData = ReturnEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'return_pickup',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: validatedData.pickupDate || 'N/A' }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Return for order ${validatedData.orderId} is scheduled for ${validatedData.pickupDate}.`
        });
        break;
      }

      case 'return.refund_initiated': {
        const validatedData = ReturnEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'refund_initiated',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: String(validatedData.days || '0') }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Refund for order ${validatedData.orderId} initiated. Expect it in ${validatedData.days} days.`
        });
        break;
      }

      case 'stock.low': {
        const validatedData = StockEventSchema.parse(data);
        await this.coordinator.processNotification({
          eventType: name,
          recipientPhone: env.ADMIN_PHONE,
          waTemplateName: 'admin_stock_alert',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.productName }, { type: 'text', text: String(validatedData.stockCount) }] }
          ],
          fallbackSmsBody: `ALERT: Stock low for ${validatedData.productName} (${validatedData.stockCount} units left).`
        });
        break;
      }

      case 'order.delivered': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'delivery_confirmation',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Order ${validatedData.orderId} is delivered. Enjoy your fabric!`
        });
        
        // Schedule loyalty triggers
        await this.scheduler.scheduleLoyaltySequence(validatedData);
        break;
      }

      case 'loyalty.day30': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'loyalty_day30',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.fabricType || '' }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Loved your ${validatedData.fabricType}? Check out our new arrivals matching your style!`
        });
        break;
      }

      case 'loyalty.day45': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          userId: validatedData.userId,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone: validatedData.customerPhone,
          waTemplateName: 'loyalty_day45',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.fabricType || '' }] }
          ],
          fallbackSmsBody: `Fabric Speaks: Our premium ${validatedData.fabricType} collection is selling fast! Get yours before stock ends.`
        });
        break;
      }

      default:
        logger.info(`Event ${name} is ignored by Notification Service.`);
    }
  }

  async close() {
    await this.worker.close();
    await this.scheduler.close();
  }
}
