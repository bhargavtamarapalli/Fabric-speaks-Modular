import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import multer from 'multer';

// Mocking requireAuth for standalone compilation.
// In reality, it should be imported from @fs/shared/middleware
import { Request, Response, NextFunction } from 'express';
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Mock attaching admin user for DEV only
  req.user = { id: 'admin-uuid-123', role: 'ADMIN' } as any; 
  next();
};

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get('/', InventoryController.listInventory);
router.patch('/:variantId', InventoryController.manualAdjustment);
router.post('/adjustment/bulk', upload.single('file'), InventoryController.bulkAdjustment);
router.get('/expected', InventoryController.getExpectedArrivals);
router.post('/expected', InventoryController.addExpectedArrival);
router.get('/health', InventoryController.getHealth);

export default router;
