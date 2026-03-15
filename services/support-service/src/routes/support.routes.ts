import { Router } from 'express';
import { requireAuth, requireRole, getDbPool } from '@fs/shared';
import { SupportController } from '../controllers/support.controller';
import { SupportService } from '../services/support.service';
import { SupportRepository } from '../repositories/support.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { CustomerViewService } from '../services/customer-view.service';

const router = Router();

const db = getDbPool();
const supportRepo = new SupportRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const customerViewService = new CustomerViewService(db);
const supportService = new SupportService(supportRepo, auditLogRepo, customerViewService);
const supportController = new SupportController(supportService, customerViewService);

router.use(requireAuth);
router.use(requireRole('superAdmin', 'supportAgent'));

router.get('/queue', supportController.getQueue);
router.get('/customer/:mobile', supportController.getCustomerLookup);
router.get('/:caseId', supportController.getCaseDetail);
router.patch('/:caseId/status', supportController.updateCaseStatus);
router.post('/:caseId/note', supportController.postInternalNote);

export default router;
