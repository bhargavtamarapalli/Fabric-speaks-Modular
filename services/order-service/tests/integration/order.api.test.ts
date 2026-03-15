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
  const orderId = '550e8400-e29b-41d4-a716-446655440099';

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
          payment_method: 'UPI',
          guest_mobile: '9876543210',
          guest_address: {
            full_name: 'Guest User',
            mobile: '9876543210',
            line1: '12 Main Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
          }
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
        .patch(`/api/admin/orders/${orderId}/status`)
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'SHIPPED' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to update order status', async () => {
      (OrderService.prototype.updateOrderStatus as any).mockResolvedValue({ id: orderId, status: 'SHIPPED' });

      const res = await request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'SHIPPED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SHIPPED');
    });
  });

  describe('Order Detail Timeline Routes', () => {
    it('should allow an admin to fetch order details', async () => {
      (OrderService.prototype.getAdminOrderDetails as any).mockResolvedValue({ id: orderId, status: 'CONFIRMED' });

      const res = await request(app)
        .get(`/api/admin/orders/${orderId}`)
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderId);
    });

    it('should allow an authenticated customer to fetch order timeline', async () => {
      (OrderService.prototype.getOrderTimeline as any).mockResolvedValue([
        { status: 'CONFIRMED', actor: 'admin', note: null, timestamp: new Date().toISOString() },
      ]);

      const res = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe('CONFIRMED');
    });
  });

  describe('Order Operations Routes', () => {
    it('should allow superAdmin to cancel an order with a reason', async () => {
      (OrderService.prototype.cancelOrder as any).mockResolvedValue({ id: orderId, status: 'CANCELLED' });

      const res = await request(app)
        .patch(`/api/admin/orders/${orderId}/cancel`)
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Customer requested cancellation before dispatch' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should return packing slip data for admins', async () => {
      (OrderService.prototype.getPackingSlip as any).mockResolvedValue({ orderNumber: orderId, totalItems: 1 });

      const res = await request(app)
        .get(`/api/admin/orders/${orderId}/packing-slip`)
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe(orderId);
    });

    it('should return GST invoice data for admins', async () => {
      (OrderService.prototype.getGstInvoice as any).mockResolvedValue({ invoiceNumber: 'FS-2324-10001' });

      const res = await request(app)
        .get(`/api/admin/orders/${orderId}/invoice`)
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.invoiceNumber).toBe('FS-2324-10001');
    });

    it('should export invoice data for a date range', async () => {
      (OrderService.prototype.exportBulkInvoicesCsv as any).mockResolvedValue('order_id,invoice_number\n1,INV-1');

      const res = await request(app)
        .get('/api/admin/orders/invoices/export')
        .query({
          dateFrom: '2026-03-01T00:00:00.000Z',
          dateTo: '2026-03-15T23:59:59.000Z',
        })
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.text).toContain('invoice_number');
    });

    it('should return dashboard pending actions for admins', async () => {
      (OrderService.prototype.getPendingActionsDashboard as any).mockResolvedValue({
        awaitingShiprocket: 0,
        awaitingShiprocketOrders: [],
        codPendingConfirmation: 0,
        codPendingOrders: [],
        failedPayments24h: 0,
        openReturns: 0,
      });

      const res = await request(app)
        .get('/api/admin/dashboard/pending-actions')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.failedPayments24h).toBe(0);
    });
  });
});
