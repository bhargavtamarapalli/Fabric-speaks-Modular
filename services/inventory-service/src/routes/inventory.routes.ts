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
const upload = multer({ storage: multer.memoryStorage() });

const db = getDbPool();
const invRepo = new InventoryRepository(db);
const expectedRepo = new ExpectedStockRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const inventoryService = new InventoryService(invRepo, expectedRepo, auditLogRepo);
const inventoryController = new InventoryController(inventoryService);

// Role groups: write operations are SA + IM only; reads also allow support agents
const requireWriteAccess = requireRole('superAdmin', 'inventoryManager');
const requireReadAccess = requireRole('superAdmin', 'inventoryManager', 'supportAgent');

router.use(requireAuth);

// INV-01: List inventory — all admin roles can view stock
router.get('/', requireReadAccess, inventoryController.listInventory);

// INV-02: Manual stock adjustment — write access only (SA + IM)
router.patch('/:variantId', requireWriteAccess, validateBody(ManualAdjustmentSchema), inventoryController.manualAdjustment);

// INV-08/SET-05: Update stock threshold
router.patch('/:variantId/threshold', requireWriteAccess, validateBody(UpdateThresholdSchema), inventoryController.updateThreshold);

// Bulk CSV adjustment — write access only
router.post('/adjustment/bulk', requireWriteAccess, upload.single('file'), inventoryController.bulkAdjustment);

// INV-04/05/07: Expected arrivals — write access only
router.get('/expected', requireWriteAccess, inventoryController.getExpectedArrivals);
router.post('/expected', requireWriteAccess, validateBody(ExpectedArrivalSchema), inventoryController.addExpectedArrival);
router.patch('/expected/:id/receive', requireWriteAccess, inventoryController.markArrivalReceived);

// INV-05: Stock health dashboard — read access (SA + IM can see full data)
router.get('/health', requireWriteAccess, inventoryController.getHealth);

// INV-09: Stock velocity details
router.get('/velocity', requireWriteAccess, inventoryController.getVelocity);

// INV-10: Restock suggestions
router.get('/suggestions', requireWriteAccess, inventoryController.getRestockSuggestions);

// INV-11: Dead stock alert
router.get('/dead-stock', requireWriteAccess, inventoryController.getDeadStock);

// INV-12: Size/colour demand pattern
router.get('/demand-patterns', requireWriteAccess, inventoryController.getDemandPatterns);

export default router;
