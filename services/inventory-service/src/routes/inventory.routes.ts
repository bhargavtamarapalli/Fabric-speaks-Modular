import { Router } from 'express';
import { requireAuth, getDbPool } from '@fs/shared';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryService } from '../services/inventory.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ExpectedStockRepository } from '../repositories/expected-stock.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { ManualAdjustmentSchema, ExpectedArrivalSchema } from '../schemas/inventory.schemas';
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

router.use(requireAuth);

router.get('/', inventoryController.listInventory);
router.patch('/:variantId', validateBody(ManualAdjustmentSchema), inventoryController.manualAdjustment);
router.post('/adjustment/bulk', upload.single('file'), inventoryController.bulkAdjustment);
router.get('/expected', inventoryController.getExpectedArrivals);
router.post('/expected', validateBody(ExpectedArrivalSchema), inventoryController.addExpectedArrival);
router.get('/health', inventoryController.getHealth);

export default router;
