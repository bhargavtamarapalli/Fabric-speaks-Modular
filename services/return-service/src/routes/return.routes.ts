import { Router } from 'express';
import { requireAuth, requireRole, getDbPool } from '@fs/shared';
import { ReturnController } from '../controllers/return.controller';
import { ReturnService } from '../services/return.service';
import { ReturnRepository } from '../repositories/return.repository';
import { ShiprocketService } from '../services/shiprocket.service';

const router = Router();

const db = getDbPool();
const returnRepo = new ReturnRepository(db);
const shiprocketService = new ShiprocketService();
const returnService = new ReturnService(returnRepo, shiprocketService);
const returnController = new ReturnController(returnService);

const requireAdmin = requireRole('superAdmin', 'supportAgent');

// Customer Facing (RET-01, RET-02)
router.post('/orders/:orderId/return', requireAuth, returnController.initiateReturn);
router.get('/returns/:returnId', requireAuth, returnController.getReturnStatus);

// Admin endpoints (RET-06, RET-03, RET-04, RET-05)
router.get('/admin/returns', requireAdmin, returnController.listReturns);
router.patch('/admin/returns/:returnId/status', requireAdmin, returnController.updateStatus);
router.post('/admin/returns/:returnId/shiprocket', requireAdmin, returnController.scheduleShiprocketPickup);
router.post('/admin/returns/:returnId/resolve', requireAdmin, returnController.resolveReturn);

export default router;
