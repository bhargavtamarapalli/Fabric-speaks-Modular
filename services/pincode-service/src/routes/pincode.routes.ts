import { Router } from 'express';
import { requireAuth, requireRole } from '@fs/shared/middleware';
import { PincodeController } from '../controllers/pincode.controller';
import { PincodeService } from '../services/pincode.service';
import { PincodeRepository } from '../repositories/pincode.repository';
import { getDbPool } from '@fs/shared/db';
import { getRedisClient } from '@fs/shared/redis';

export const pincodeRouter = Router();

const db = getDbPool();
const redis = getRedisClient();

const pincodeRepo = new PincodeRepository(db);
const pincodeService = new PincodeService(pincodeRepo, redis);
const pincodeController = new PincodeController(pincodeService);

// GET /pincode/:pincode/serviceability
pincodeRouter.get('/:pincode/serviceability', pincodeController.getServiceability);

// POST /admin/pincode/bulk-upload
pincodeRouter.post('/admin/bulk-upload', requireAuth, requireRole('superAdmin', 'inventoryManager'), pincodeController.bulkUpload);
