import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole, getDbPool } from '@fs/shared';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryService } from '../services/inventory.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ExpectedStockRepository } from '../repositories/expected-stock.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { ManualAdjustmentSchema, ExpectedArrivalSchema, UpdateThresholdSchema } from '../schemas/inventory.schemas';
import { validateBody } from '../middleware/validate';
import { INVENTORY_CONFIG } from '../config/inventory.config';

const router = Router();
const v1Router = Router();

// Critical #7: File size limit sourced from centralized config — synced with controller
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: INVENTORY_CONFIG.BULK_UPLOAD.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const isAllowed =
      (INVENTORY_CONFIG.BULK_UPLOAD.ALLOWED_MIMETYPES as readonly string[]).includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
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

v1Router.use(requireAuth);

// INV-01: List inventory — all admin roles can view stock
v1Router.get('/', requireReadAccess, inventoryController.listInventory);

// INV-02: Manual stock adjustment — write access only (SA + IM)
v1Router.patch('/:variantId', requireWriteAccess, validateBody(ManualAdjustmentSchema), inventoryController.manualAdjustment);

// INV-08/SET-05: Update stock threshold
v1Router.patch('/:variantId/threshold', requireWriteAccess, validateBody(UpdateThresholdSchema), inventoryController.updateThreshold);

// Bulk CSV adjustment — write access only (order matters: specific routes before param routes)
v1Router.post('/adjustment/bulk', requireWriteAccess, upload.single('file'), inventoryController.bulkAdjustment);

// INV-04/05/07: Expected arrivals — write access only
v1Router.get('/expected', requireWriteAccess, inventoryController.getExpectedArrivals);
v1Router.post('/expected', requireWriteAccess, validateBody(ExpectedArrivalSchema), inventoryController.addExpectedArrival);
v1Router.post('/expected/:id/receive', requireWriteAccess, inventoryController.markArrivalReceived);

// INV-05: Stock health dashboard — read access (SA + IM can see full data)
v1Router.get('/health', requireReadAccess, inventoryController.getHealth);

// INV-09: Stock velocity details
v1Router.get('/velocity', requireWriteAccess, inventoryController.getVelocity);

// INV-10: Restock suggestions
v1Router.get('/suggestions', requireWriteAccess, inventoryController.getRestockSuggestions);

// INV-11: Dead stock alert
v1Router.get('/dead-stock', requireWriteAccess, inventoryController.getDeadStock);

// INV-12: Size/colour demand pattern
v1Router.get('/demand-patterns', requireWriteAccess, inventoryController.getDemandPatterns);

router.use('/v1', v1Router);
router.use('/', (_req, res, next) => {
  res.setHeader('X-Api-Deprecated', 'true');
  next();
}, v1Router);

export default router;
