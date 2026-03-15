import { Worker, Job } from 'bullmq';
import { getRedisClient, getDbPool } from '@fs/shared';
import { logger } from '@fs/shared';
import { NotificationCoordinator } from '../services/NotificationCoordinator';
import { LoyaltyScheduler } from './LoyaltyScheduler';
import { env } from '../config/env';
import { OrderEventSchema, StockEventSchema, ReturnEventSchema, AdminEventSchema } from '../schemas/notification.schemas';

const QUEUE_NAMES = ['platform_events', 'order_events', 'payment-events'];

export class EventConsumer {
  private workers: Worker[];
  private coordinator: NotificationCoordinator;
  private scheduler: LoyaltyScheduler;
  private db = getDbPool();

  constructor() {
    this.coordinator = new NotificationCoordinator();
    this.scheduler = new LoyaltyScheduler();
    const redis = getRedisClient();

    this.workers = QUEUE_NAMES.map((queueName) => {
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          logger.info(`Processing event ${job.name} from ${queueName} (Job ID: ${job.id})`);
          try {
            await this.handleEvent(job);
          } catch (error) {
            logger.error(`Failed to process event ${job.name}:`, error);
            throw error;
          }
        },
        { connection: redis as any }
      );

      worker.on('completed', (job) => {
        logger.info(`Event ${job.name} completed successfully.`);
      });

      worker.on('failed', (job, err) => {
        logger.error(`Event ${job?.name} failed:`, err);
      });

      return worker;
    });
  }

  private async handleEvent(job: Job): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case 'order.created': {
        const validatedData = OrderEventSchema.parse(data);
        const context = await this.getOrderContext(validatedData.orderId);
        const recipientPhone = validatedData.customerPhone || context?.customerPhone;
        if (recipientPhone) {
          await this.coordinator.processNotification({
            userId: validatedData.userId || context?.userId || undefined,
            orderId: validatedData.orderId,
            eventType: name,
            recipientPhone,
            waTemplateName: 'order_confirmation',
            waComponents: [
              { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: String(validatedData.totalAmount || context?.totalAmount || '0') }] }
            ],
            fallbackSmsBody: `Fabric Speaks: Your order ${validatedData.orderId} for Rs. ${validatedData.totalAmount || context?.totalAmount || '0'} is confirmed.`
          });
        }

        await this.coordinator.processNotification({
          eventType: 'admin.order_created',
          recipientPhone: env.ADMIN_PHONE,
          waTemplateName: 'admin_new_order',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: String(validatedData.totalAmount || context?.totalAmount || '0') }] }
          ],
          fallbackSmsBody: `ADMIN ALERT: New order ${validatedData.orderId} placed for Rs. ${validatedData.totalAmount || context?.totalAmount || '0'}.`
        });

        if ((validatedData.paymentMethod || context?.paymentMethod) === 'COD') {
          await this.coordinator.processNotification({
            eventType: 'admin.cod_order_created',
            recipientPhone: env.ADMIN_PHONE,
            waTemplateName: 'admin_cod_order',
            waComponents: [
              { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
            ],
            fallbackSmsBody: `ADMIN ALERT: COD order ${validatedData.orderId} requires attention.`
          });
        }
        break;
      }

      case 'payment.captured': {
        const validatedData = OrderEventSchema.parse(data);
        const context = await this.getOrderContext(validatedData.orderId);
        const recipientPhone = validatedData.customerPhone || context?.customerPhone;
        if (!recipientPhone) {
          break;
        }
        await this.coordinator.processNotification({
          userId: validatedData.userId || context?.userId || undefined,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone,
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
        const context = await this.getOrderContext(validatedData.orderId);
        const recipientPhone = validatedData.customerPhone || context?.customerPhone;
        if (!recipientPhone) {
          break;
        }
        await this.coordinator.processNotification({
          userId: validatedData.userId || context?.userId || undefined,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone,
          waTemplateName: 'cod_confirmed',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
          ],
          fallbackSmsBody: `Fabric Speaks: COD Order ${validatedData.orderId} is confirmed.`
        });
        break;
      }

      case 'payment.failed': {
        const validatedData = OrderEventSchema.parse(data);
        await this.coordinator.processNotification({
          eventType: 'admin.payment_failed',
          recipientPhone: env.ADMIN_PHONE,
          waTemplateName: 'admin_payment_failed',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
          ],
          fallbackSmsBody: `ADMIN ALERT: Payment failed for order ${validatedData.orderId}.`
        });
        break;
      }

      case 'order.status_changed': {
        const validatedData = OrderEventSchema.parse(data);
        const context = await this.getOrderContext(validatedData.orderId);
        const recipientPhone = validatedData.customerPhone || context?.customerPhone;
        const nextStatus = validatedData.newStatus;

        if (nextStatus === 'SHIPPED' && recipientPhone) {
          await this.coordinator.processNotification({
            userId: validatedData.userId || context?.userId || undefined,
            orderId: validatedData.orderId,
            eventType: 'order.shipped',
            recipientPhone,
            waTemplateName: 'order_shipped',
            waComponents: [
              { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: validatedData.awb || 'N/A' }] }
            ],
            fallbackSmsBody: `Fabric Speaks: Order ${validatedData.orderId} shipped. AWB: ${validatedData.awb || 'N/A'}`
          });
        }

        if (nextStatus === 'DELIVERED' && recipientPhone) {
          await this.coordinator.processNotification({
            userId: validatedData.userId || context?.userId || undefined,
            orderId: validatedData.orderId,
            eventType: 'order.delivered',
            recipientPhone,
            waTemplateName: 'delivery_confirmation',
            waComponents: [
              { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
            ],
            fallbackSmsBody: `Fabric Speaks: Order ${validatedData.orderId} is delivered. Enjoy your fabric!`
          });

          const userId = validatedData.userId || context?.userId || undefined;
          if (userId) {
            await this.scheduler.scheduleLoyaltySequence({
              userId,
              orderId: validatedData.orderId,
              customerPhone: recipientPhone,
              fabricType: context?.fabricType || undefined,
            });
          }
        }
        break;
      }

      case 'order.shipped': {
        const validatedData = OrderEventSchema.parse(data);
        const recipientPhone = validatedData.customerPhone;
        if (!recipientPhone) {
          break;
        }
        await this.coordinator.processNotification({
          userId: validatedData.userId ?? undefined,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone,
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
          eventType: 'admin.return_requested',
          recipientPhone: env.ADMIN_PHONE,
          waTemplateName: 'admin_return_requested',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }] }
          ],
          fallbackSmsBody: `ADMIN ALERT: Return requested for order ${validatedData.orderId}.`
        });
        break;
      }

      case 'return.refund_initiated': {
        const validatedData = ReturnEventSchema.parse(data);
        const context = await this.getOrderContext(validatedData.orderId);
        const recipientPhone = validatedData.customerPhone || context?.customerPhone;
        if (!recipientPhone) {
          break;
        }
        await this.coordinator.processNotification({
          userId: validatedData.userId || context?.userId || undefined,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone,
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

      case 'stock.critical': {
        const validatedData = StockEventSchema.parse(data);
        await this.coordinator.processNotification({
          eventType: name,
          recipientPhone: env.ADMIN_PHONE,
          waTemplateName: 'admin_stock_critical',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.productName }, { type: 'text', text: String(validatedData.stockCount) }] }
          ],
          fallbackSmsBody: `CRITICAL: ${validatedData.productName} is out of stock (${validatedData.stockCount}).`
        });
        break;
      }

      case 'return.pickup_failed': {
        const validatedData = ReturnEventSchema.parse(data);
        await this.coordinator.processNotification({
          eventType: name,
          recipientPhone: env.ADMIN_PHONE,
          waTemplateName: 'admin_pickup_failed',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.orderId }, { type: 'text', text: validatedData.returnId || 'N/A' }] }
          ],
          fallbackSmsBody: `ADMIN ALERT: Shiprocket pickup failed for return ${validatedData.returnId || 'N/A'} (order ${validatedData.orderId}). ${validatedData.reason || ''}`.trim()
        });
        break;
      }

      case 'admin.user_created': {
        const validatedData = AdminEventSchema.parse(data);
        await this.coordinator.processNotification({
          eventType: name,
          recipientPhone: env.ADMIN_PHONE,
          waTemplateName: 'admin_user_created',
          waComponents: [
            { type: 'body', parameters: [{ type: 'text', text: validatedData.adminName || 'New admin' }, { type: 'text', text: validatedData.role || 'unknown' }] }
          ],
          fallbackSmsBody: `ADMIN ALERT: New admin user ${validatedData.adminName || 'unknown'} created with role ${validatedData.role || 'unknown'}.`
        });
        break;
      }

      case 'loyalty.day30': {
        const validatedData = OrderEventSchema.parse(data);
        const recipientPhone = validatedData.customerPhone;
        if (!recipientPhone) {
          break;
        }
        await this.coordinator.processNotification({
          userId: validatedData.userId ?? undefined,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone,
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
        const recipientPhone = validatedData.customerPhone;
        if (!recipientPhone) {
          break;
        }
        await this.coordinator.processNotification({
          userId: validatedData.userId ?? undefined,
          orderId: validatedData.orderId,
          eventType: name,
          recipientPhone,
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
    await Promise.all(this.workers.map((worker) => worker.close()));
    await this.scheduler.close();
  }

  private async getOrderContext(orderId: string): Promise<{
    userId: string | null;
    customerPhone: string | null;
    totalAmount: number;
    paymentMethod: string;
    fabricType: string | null;
  } | null> {
    const { rows } = await this.db.query(
      `SELECT
          o.user_id AS "userId",
          COALESCE(addr.mobile, o.guest_mobile, u.mobile) AS "customerPhone",
          o.total_amount AS "totalAmount",
          o.payment_method AS "paymentMethod",
          p.fabric_type AS "fabricType"
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN LATERAL (
          SELECT a.mobile
          FROM order_items oi
          JOIN addresses a ON a.id = oi.delivery_address_id
          WHERE oi.order_id = o.id
          ORDER BY oi.created_at ASC
          LIMIT 1
       ) addr ON true
       LEFT JOIN LATERAL (
          SELECT p.fabric_type
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = o.id
          ORDER BY oi.created_at ASC
          LIMIT 1
       ) p ON true
       WHERE o.id = $1`,
      [orderId]
    );

    return rows[0] || null;
  }
}
