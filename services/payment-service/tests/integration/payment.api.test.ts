import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import paymentRoutes from '../../src/routes/payment.routes';
import { globalErrorHandler } from '@fs/shared';
import { PaymentService } from '../../src/services/payment.service';

// Mock dependencies
vi.mock('../../src/services/payment.service');
vi.mock('razorpay');
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
  })),
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
// Mock auth middleware
app.use((req: any, res, next) => {
  if (req.headers.authorization === 'Bearer user-token') {
    req.user = { userId: 'user-123', role: 'customer' };
  } else if (req.headers.authorization === 'Bearer admin-token') {
    req.user = { userId: 'admin-123', role: 'superAdmin' };
  }
  next();
});
app.use('/api', paymentRoutes);
app.use(globalErrorHandler);

describe('Payment Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PAY-01: POST /payments/initiate', () => {
    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).post('/api/payments/initiate').send({});
      expect(res.status).toBe(401);
    });

    it('should return 200 and rzp data when authenticated', async () => {
      const mockResult = { razorpayOrderId: 'rzp_123', amount: 1000, currency: 'INR', key: 'key_123' };
      (PaymentService.prototype.initiatePayment as any).mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', 'Bearer user-token')
        .send({ orderId: '550e8400-e29b-41d4-a716-446655440000', amount: 10.00 });

      expect(res.status).toBe(200);
      expect(res.body.data.razorpayOrderId).toBe('rzp_123');
    });
  });

  describe('PAY-02: POST /payments/verify', () => {
    it('should call verifyPayment service', async () => {
      (PaymentService.prototype.verifyPayment as any).mockResolvedValue({ id: 'pay-1', status: 'CAPTURED' });

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', 'Bearer user-token')
        .send({ 
          razorpayOrderId: 'rzp_123', 
          razorpayPaymentId: 'pay_123', 
          razorpaySignature: 'sig_123' 
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CAPTURED');
    });
  });

  describe('PAY-05: POST /webhook/razorpay', () => {
    it('should handle incoming webhooks without auth', async () => {
      (PaymentService.prototype.handleWebhook as any).mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/webhook/razorpay')
        .set('x-razorpay-signature', 'sig_123')
        .send({ event: 'payment.captured', payload: {} });

      expect(res.status).toBe(200);
      expect(PaymentService.prototype.handleWebhook).toHaveBeenCalled();
    });
  });

  describe('PAY-06: POST /admin/payments/:orderId/refund', () => {
    it('should return 403 for non-admin', async () => {
      const res = await request(app)
        .post('/api/admin/payments/order-1/refund')
        .set('Authorization', 'Bearer user-token')
        .send({ amount: 50.00 });

      expect(res.status).toBe(403);
    });

    it('should allow admin to initiate refund', async () => {
      (PaymentService.prototype.refundPayment as any).mockResolvedValue({ status: 'REFUNDED' });

      const res = await request(app)
        .post('/api/admin/payments/order-1/refund')
        .set('Authorization', 'Bearer admin-token')
        .send({ amount: 50.00 });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REFUNDED');
    });
  });
});
