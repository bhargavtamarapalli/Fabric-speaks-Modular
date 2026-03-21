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
router.get('/orders/:orderId/timeline', requireAuth, orderController.getOrderTimeline);

// guest routes
router.get('/orders/track/:token', orderController.trackGuestOrder); // ORD-04

// admin routes
router.patch('/admin/orders/:orderId/status', requireAuth, requireRole('superAdmin'), orderController.adminUpdateStatus); // ORD-05
router.patch('/admin/orders/:orderId/cancel', requireAuth, requireRole('superAdmin'), orderController.adminCancelOrder);
router.post('/admin/orders/:orderId/shiprocket', requireAuth, requireRole('superAdmin'), orderController.adminPushToShiprocket); // ORD-06
router.get('/admin/orders/invoices/export', requireAuth, requireRole('superAdmin'), orderController.adminExportInvoices);
router.get('/admin/orders/:orderId/packing-slip', requireAuth, requireRole('superAdmin'), orderController.adminGetPackingSlip);
router.get('/admin/orders/:orderId/invoice', requireAuth, requireRole('superAdmin'), orderController.adminGetGstInvoice);
router.post('/admin/orders/bulk/shiprocket', requireAuth, requireRole('superAdmin'), orderController.adminBulkPushToShiprocket);
router.patch('/admin/orders/bulk/status', requireAuth, requireRole('superAdmin'), orderController.adminBulkUpdateStatus);
router.get('/admin/orders/export', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminExportOrders);
router.get('/admin/dashboard/pending-actions', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminGetPendingActions);
router.get('/admin/orders/:orderId/timeline', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminGetOrderTimeline);
router.get('/admin/orders/:orderId', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminGetOrderById);
router.get('/admin/orders', requireAuth, requireRole('superAdmin', 'supportAgent'), orderController.adminListOrders); // ORD-07

// webhooks (with signature validation)
// SECURITY: All Shiprocket webhooks MUST be validated with HMAC-SHA256 signature
router.post('/webhook/shiprocket', validateShiprocketSourceIP, validateShiprocketWebhookSignature, orderController.shiprocketWebhook); // ORD-08

export default router;
