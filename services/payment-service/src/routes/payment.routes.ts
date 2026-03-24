import Razorpay from 'razorpay';
import { Queue } from 'bullmq';
import { Router } from 'express';
import { getDbPool, getRedisClient, logger, requireAuth, requireRole } from '@fs/shared';
import { PAYMENT_EVENT_QUEUE_NAME } from '../constants/payment.constants';
import { env } from '../config/env';
import { PaymentController } from '../controllers/payment.controller';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentService } from '../services/payment.service';

const router = Router();

const db = getDbPool();
const paymentRepo = new PaymentRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const razorpayClient = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});
export const paymentEventQueue = new Queue(PAYMENT_EVENT_QUEUE_NAME, {
  connection: getRedisClient(),
});

const paymentService = new PaymentService({
  paymentRepo,
  auditLogRepo,
  razorpayClient,
  eventQueue: paymentEventQueue,
  logger,
  config: {
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },
});
const paymentController = new PaymentController(paymentService);

router.post('/payments/initiate', requireAuth, paymentController.initiatePayment);
router.post('/payments/verify', requireAuth, paymentController.verifyPayment);
router.post('/payments/cod/confirm', requireAuth, paymentController.confirmCod);
router.get('/payments/:orderId/status', requireAuth, paymentController.getPaymentStatus);
router.post('/webhook/razorpay', paymentController.handleWebhook);
router.post(
  '/admin/payments/:orderId/refund',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  paymentController.refundPayment
);

export default router;
