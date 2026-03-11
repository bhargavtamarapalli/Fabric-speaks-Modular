import { Router } from 'express';
import { ReturnController } from '../controllers/return.controller';

// Mock middleware
import { Request, Response, NextFunction } from 'express';
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  req.user = { id: 'user-uuid-123', role: 'CUSTOMER' } as any; 
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  req.user = { id: 'admin-uuid-123', role: 'ADMIN' } as any; 
  next();
};

const router = Router();

// Customer Facing (RET-01, RET-02)
router.post('/orders/:orderId/return', requireAuth, ReturnController.initiateReturn);
router.get('/returns/:returnId', requireAuth, ReturnController.getReturnStatus);

// Admin endpoints (RET-06, RET-03, RET-04, RET-05)
router.get('/admin/returns', requireAdmin, ReturnController.listReturns);
router.patch('/admin/returns/:returnId/status', requireAdmin, ReturnController.updateStatus);
router.post('/admin/returns/:returnId/shiprocket', requireAdmin, ReturnController.scheduleShiprocketPickup);
router.post('/admin/returns/:returnId/resolve', requireAdmin, ReturnController.resolveReturn);

export default router;
