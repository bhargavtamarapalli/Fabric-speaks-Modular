import { Router } from 'express';
import { requireAuth, requireRole, getDbPool, getRedisClient } from '@fs/shared';
import { PincodeController } from '../controllers/pincode.controller';
import { PincodeService } from '../services/pincode.service';
import { PincodeRepository } from '../repositories/pincode.repository';

const router = Router();

const db = getDbPool();
const redis = getRedisClient();

const pincodeRepo = new PincodeRepository(db);
const pincodeService = new PincodeService(pincodeRepo, redis);
const pincodeController = new PincodeController(pincodeService);

router.get('/:pincode/serviceability', pincodeController.getServiceability);
router.post('/admin/bulk-upload', requireAuth, requireRole('superAdmin', 'inventoryManager'), pincodeController.bulkUpload);

export default router;
