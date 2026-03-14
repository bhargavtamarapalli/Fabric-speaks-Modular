import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { getDbPool, requireAuth, requireRole } from '@fs/shared';

const router = Router();

const db = getDbPool();
const paymentRepo = new PaymentRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const paymentService = new PaymentService(paymentRepo, auditLogRepo);
const paymentController = new PaymentController(paymentService);

// Customer endpoints
router.post('/payments/initiate', requireAuth, paymentController.initiatePayment);
router.post('/payments/verify', requireAuth, paymentController.verifyPayment);
router.post('/payments/cod/confirm', requireAuth, paymentController.confirmCod);
router.get('/payments/:orderId/status', requireAuth, paymentController.getPaymentStatus);

// Webhook (No auth, HMAC verified inside controller)
router.post('/webhook/razorpay', paymentController.handleWebhook);

// Admin endpoints
router.post('/admin/payments/:orderId/refund', requireAuth, requireRole('superAdmin', 'inventoryManager'), paymentController.refundPayment);

export default router;
