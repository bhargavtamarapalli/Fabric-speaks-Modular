import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import orderRoutes from '../../src/routes/order.routes';
import { globalErrorHandler } from '@fs/shared';
import { OrderService } from '../../src/services/order.service';

// Mock OrderService
vi.mock('../../src/services/order.service');

const app = express();
app.use(express.json());
app.use(cookieParser());
// Mock middleware to simulate authenticated user
app.use((req: any, res, next) => {
  if (req.headers.authorization === 'Bearer valid-token') {
    req.user = { userId: 'user-123', role: 'customer' };
  } else if (req.headers.authorization === 'Bearer admin-token') {
    req.user = { userId: 'admin-123', role: 'superAdmin' };
  }
  next();
});
app.use('/api', orderRoutes);
app.use(globalErrorHandler);

describe('Order Service Integration Tests (Edge Cases)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ORD-01: POST /orders', () => {
    it('should allow guest checkout without auth', async () => {
      const mockOrder = { id: 'order-123', status: 'PLACED' };
      (OrderService.prototype.placeOrder as any).mockResolvedValue(mockOrder);

      const res = await request(app)
        .post('/api/orders')
        .send({
          cart_items: [{ variant_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
          address_id: '550e8400-e29b-41d4-a716-446655440001',
          payment_method: 'UPI'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('order-123');
    });

    it('should use userId when authenticated', async () => {
      (OrderService.prototype.placeOrder as any).mockResolvedValue({ id: 'order-456' });

      await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cart_items: [{ variant_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
          address_id: '550e8400-e29b-41d4-a716-446655440001',
          payment_method: 'UPI'
        });

      expect(OrderService.prototype.placeOrder).toHaveBeenCalledWith('user-123', expect.anything());
    });
  });

  describe('ORD-02 & ORD-03: Security', () => {
    it('should return 401 for unauthenticated access to my orders', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('should return 401 for unauthenticated access to order details', async () => {
      const res = await request(app).get('/api/orders/some-id');
      expect(res.status).toBe(401);
    });
  });

  describe('ORD-05: Admin Access Control', () => {
    it('should return 403 if customer tries to update order status', async () => {
      const res = await request(app)
        .patch('/api/admin/orders/order-123/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'SHIPPED' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to update order status', async () => {
      (OrderService.prototype.updateOrderStatus as any).mockResolvedValue({ id: 'order-123', status: 'SHIPPED' });

      const res = await request(app)
        .patch('/api/admin/orders/order-123/status')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'SHIPPED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SHIPPED');
    });
  });
});
