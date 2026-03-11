import { Router } from 'express';
// Assuming @fs/shared/middleware has these exported
import { requireAuth, requireRole } from '@fs/shared/middleware';

import { 
  getQueue, 
  getCaseDetail, 
  updateCaseStatus, 
  getCustomerLookup, 
  postInternalNote 
} from '../controllers/support.controller';

export const supportRouter = Router();

// Globally secure Support endpoints
supportRouter.use(requireAuth);
supportRouter.use(requireRole('superAdmin', 'supportAgent'));

// ==========================================
// Support Tickets (SUP-01 - 03, 05)
// ==========================================

// SUP-01: GET /admin/support/queue
supportRouter.get('/queue', getQueue);

// SUP-02: GET /admin/support/:caseId
supportRouter.get('/:caseId', getCaseDetail);

// SUP-03: PATCH /admin/support/:caseId/status (also allows note and priority)
supportRouter.patch('/:caseId/status', updateCaseStatus);

// SUP-05: POST /admin/support/:caseId/note
supportRouter.post('/:caseId/note', postInternalNote);

// ==========================================
// Customer 360 Lookup (SUP-04)
// ==========================================

// SUP-04: GET /admin/support/customer/:mobile
supportRouter.get('/customer/:mobile', getCustomerLookup);
