import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { OrderService } from '../services/order.service';
import { OrderRepository } from '../repositories/order.repository';
import { requireAuth, requireRole, getDbPool } from '@fs/shared';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { validateShiprocketSourceIP, validateShiprocketWebhookSignature } from '../middleware/validateShiprocketWebhook';

const router = Router();

const db = getDbPool();
const orderRepo = new OrderRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const orderService = new OrderService(orderRepo, auditLogRepo);
const orderController = new OrderController(orderService);

// customer routes
router.post('/orders', orderController.placeOrder); // ORD-01 (guest/auth)
router.get('/orders', requireAuth, orderController.getMyOrders); // ORD-02 (auth)
router.get('/orders/:orderId', requireAuth, orderController.getOrderById); // ORD-03 (auth)

// guest routes
router.get('/orders/track/:token', orderController.trackGuestOrder); // ORD-04

// admin routes
router.patch('/admin/orders/:orderId/status', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminUpdateStatus); // ORD-05
router.post('/admin/orders/:orderId/shiprocket', requireAuth, requireRole('superAdmin'), orderController.adminPushToShiprocket); // ORD-06
router.get('/admin/orders', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminListOrders); // ORD-07

// webhooks
router.post('/webhook/shiprocket', validateShiprocketSourceIP, validateShiprocketWebhookSignature, orderController.shiprocketWebhook); // ORD-08

export default router;
