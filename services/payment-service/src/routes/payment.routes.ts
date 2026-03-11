import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { requireAuth, requireRole } from '@fs/shared';

const router = Router();
const paymentController = new PaymentController();

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
