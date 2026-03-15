import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { OrderService } from '../services/order.service';
import { OrderRepository } from '../repositories/order.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { ShiprocketClient } from '../services/shiprocket.client';
import { requireAuth, requireRole, getDbPool } from '@fs/shared';
import { validateShiprocketWebhookSignature, validateShiprocketSourceIP } from '../middleware/validateShiprocketWebhook';

const router = Router();

const db = getDbPool();
const orderRepo = new OrderRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const shiprocketClient = new ShiprocketClient();
const orderService = new OrderService(orderRepo, auditLogRepo, shiprocketClient);
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
router.post('/admin/orders/bulk/shiprocket', requireAuth, requireRole('superAdmin'), orderController.adminBulkPushToShiprocket);
router.get('/admin/orders/export', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminExportOrders);
router.get('/admin/orders', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminListOrders); // ORD-07

// webhooks (with signature validation)
// SECURITY: All Shiprocket webhooks MUST be validated with HMAC-SHA256 signature
router.post('/webhook/shiprocket', validateShiprocketSourceIP, validateShiprocketWebhookSignature, orderController.shiprocketWebhook); // ORD-08

export default router;
