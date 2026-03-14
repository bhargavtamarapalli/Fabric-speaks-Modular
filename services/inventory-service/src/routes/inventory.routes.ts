import { Router } from 'express';
import { requireAuth, getDbPool } from '@fs/shared';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryService } from '../services/inventory.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ExpectedStockRepository } from '../repositories/expected-stock.repository';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const db = getDbPool();
const invRepo = new InventoryRepository(db);
const expectedRepo = new ExpectedStockRepository(db);
const inventoryService = new InventoryService(invRepo, expectedRepo);
const inventoryController = new InventoryController(inventoryService);

router.use(requireAuth);

router.get('/', inventoryController.listInventory);
router.patch('/:variantId', inventoryController.manualAdjustment);
router.post('/adjustment/bulk', upload.single('file'), inventoryController.bulkAdjustment);
router.get('/expected', inventoryController.getExpectedArrivals);
router.post('/expected', inventoryController.addExpectedArrival);
router.get('/health', inventoryController.getHealth);

export default router;
