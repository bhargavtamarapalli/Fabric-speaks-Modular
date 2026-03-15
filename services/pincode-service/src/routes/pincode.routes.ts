import { Router } from 'express';
import { requireAuth, requireRole, getDbPool, getRedisClient } from '@fs/shared';
import { PincodeController } from '../controllers/pincode.controller';
import { PincodeService } from '../services/pincode.service';
import { PincodeRepository } from '../repositories/pincode.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { pincodeRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const db = getDbPool();
const redis = getRedisClient();

const pincodeRepo = new PincodeRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const pincodeService = new PincodeService(pincodeRepo, redis, auditLogRepo);
const pincodeController = new PincodeController(pincodeService);

// Rate limit public endpoint: 100 requests per 15 minutes per IP (standard)
const pincodeLimiter = pincodeRateLimiter;

router.get('/:pincode/serviceability', pincodeLimiter, pincodeController.getServiceability);
router.post('/admin/bulk-upload', requireAuth, requireRole('superAdmin', 'inventoryManager'), pincodeController.bulkUpload);

export default router;
