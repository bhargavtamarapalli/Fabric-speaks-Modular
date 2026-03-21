import { Router } from 'express';
import { requireAuth, requireRole, getDbPool, validateRequest } from '@fs/shared';
import { ReturnController } from '../controllers/return.controller';
import { ReturnService } from '../services/return.service';
import { ReturnRepository } from '../repositories/return.repository';
import { ShiprocketService } from '../services/shiprocket.service';
import { InternalService } from '../services/internal.service';
import { initiateReturnSchema, updateStatusSchema, resolveReturnSchema } from '../schemas/return.schemas';

import { AuditLogRepository } from '../repositories/audit-log.repository';

const router = Router();

const db = getDbPool();
const returnRepo = new ReturnRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const shiprocketService = new ShiprocketService();
const internalService = new InternalService();
const returnService = new ReturnService(returnRepo, shiprocketService, internalService);
const returnController = new ReturnController(returnService, auditLogRepo);

const requireAdmin = requireRole('superAdmin', 'supportAgent');

// Customer Facing
router.post(
    '/orders/:orderId/return', 
    requireAuth, 
    validateRequest(initiateReturnSchema), 
    returnController.initiateReturn
);
router.get('/returns/:returnId', requireAuth, returnController.getReturnStatus);
router.get('/returns/:returnId/timeline', requireAuth, returnController.getReturnTimeline);

// Admin endpoints — requireAuth MUST come before requireAdmin so the JWT is verified first
router.get('/admin/returns', requireAuth, requireAdmin, returnController.listReturns);
router.get('/admin/returns/:returnId/refund-status', requireAuth, requireAdmin, returnController.getRefundStatus);
router.get('/admin/returns/:returnId/timeline', requireAuth, requireAdmin, returnController.getReturnTimeline);
router.get('/admin/returns/:returnId', requireAuth, requireAdmin, returnController.getReturnStatus);
router.patch(
    '/admin/returns/:returnId/status', 
    requireAuth,
    requireAdmin, 
    validateRequest(updateStatusSchema), 
    returnController.updateStatus
);
router.post('/admin/returns/:returnId/shiprocket', requireAuth, requireAdmin, returnController.scheduleShiprocketPickup);
router.post(
    '/admin/returns/:returnId/resolve', 
    requireAuth,
    requireAdmin, 
    validateRequest(resolveReturnSchema), 
    returnController.resolveReturn
);

export default router;
