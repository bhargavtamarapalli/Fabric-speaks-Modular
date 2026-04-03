import { Router } from 'express';
import { requireAuth, requireRole, getDbPool } from '@fs/shared';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryService } from '../services/inventory.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ExpectedStockRepository } from '../repositories/expected-stock.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { ManualAdjustmentSchema, ExpectedArrivalSchema, UpdateThresholdSchema } from '../schemas/inventory.schemas';
import { validateBody } from '../middleware/validate';
import multer from 'multer';

const router = Router();
const v1Router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max upload size for bulk CSV
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

const db = getDbPool();
const invRepo = new InventoryRepository(db);
const expectedRepo = new ExpectedStockRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const inventoryService = new InventoryService(invRepo, expectedRepo, auditLogRepo);
const inventoryController = new InventoryController(inventoryService);

// Role groups: write operations are SA + IM only; reads also allow support agents
const requireWriteAccess = requireRole('superAdmin', 'inventoryManager');
const requireReadAccess = requireRole('superAdmin', 'inventoryManager', 'supportAgent');

v1Router.(requireAuth);

// INV-01: List inventory — all admin roles can view stock
v1Router.('/', requireReadAccess, inventoryController.listInventory);

// INV-02: Manual stock adjustment — write access only (SA + IM)
v1Router.('/:variantId', requireWriteAccess, validateBody(ManualAdjustmentSchema), inventoryController.manualAdjustment);

// INV-08/SET-05: Update stock threshold
v1Router.('/:variantId/threshold', requireWriteAccess, validateBody(UpdateThresholdSchema), inventoryController.updateThreshold);

// Bulk CSV adjustment — write access only
v1Router.('/adjustment/bulk', requireWriteAccess, upload.single('file'), inventoryController.bulkAdjustment);

// INV-04/05/07: Expected arrivals — write access only
v1Router.('/expected', requireWriteAccess, inventoryController.getExpectedArrivals);
v1Router.('/expected', requireWriteAccess, validateBody(ExpectedArrivalSchema), inventoryController.addExpectedArrival);
v1Router.('/expected/:id/receive', requireWriteAccess, inventoryController.markArrivalReceived);

// INV-05: Stock health dashboard — read access (SA + IM can see full data)
v1Router.('/health', requireReadAccess, inventoryController.getHealth);

// INV-09: Stock velocity details
v1Router.('/velocity', requireWriteAccess, inventoryController.getVelocity);

// INV-10: Restock suggestions
v1Router.('/suggestions', requireWriteAccess, inventoryController.getRestockSuggestions);

// INV-11: Dead stock alert
v1Router.('/dead-stock', requireWriteAccess, inventoryController.getDeadStock);

// INV-12: Size/colour demand pattern
v1Router.('/demand-patterns', requireWriteAccess, inventoryController.getDemandPatterns);

router.use('/v1', v1Router);
router.use('/', (req, res, next) => {
  res.setHeader('X-Api-Deprecated', 'true');
  next();
}, v1Router);

export default router;
