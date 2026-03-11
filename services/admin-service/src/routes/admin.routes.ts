import { Router } from 'express';
// Assuming @fs/shared/middleware has these exported
import { requireAuth, requireRole } from '@fs/shared/middleware';

// Controllers
import { 
  listAdminUsers, 
  createAdminUser, 
  updateAdminRole, 
  deleteAdminUser, 
  getAuditLogs, 
  getDashboardOps 
} from '../controllers/admin.controller';

import { 
  listCoupons, 
  createCoupon, 
  updateCoupon 
} from '../controllers/coupon.controller';

import { 
  listPages, 
  createPage, 
  updatePage 
} from '../controllers/page.controller';

import { 
  updateHomepageConfig, 
  updateNavigationConfig 
} from '../controllers/config.controller';

export const adminRouter = Router();

/**
 * ALL Admin endpoints require at least the 'supportAgent' role or higher.
 * Some specific endpoints require higher roles like 'superAdmin'.
 */

// Global middleware for whole admin suite ingress
adminRouter.use(requireAuth);

// ==========================================
// 1. Users, Metrics, & Audit (ADM-01 - 06)
// ==========================================

// ADM-01: GET /admin/users
adminRouter.get('/users', requireRole('superAdmin'), listAdminUsers);

// ADM-02: POST /admin/users (Create super admin)
adminRouter.post('/users', requireRole('superAdmin'), createAdminUser);

// ADM-03: PATCH /admin/users/:id/role
adminRouter.patch('/users/:id/role', requireRole('superAdmin'), updateAdminRole);

// ADM-04: DELETE /admin/users/:id
adminRouter.delete('/users/:id', requireRole('superAdmin'), deleteAdminUser);

// ADM-05: GET /admin/audit-log
adminRouter.get('/audit-log', requireRole('superAdmin'), getAuditLogs);

// ADM-06: GET /admin/dashboard
adminRouter.get('/dashboard/ops', requireRole('superAdmin', 'supportAgent'), getDashboardOps);

// ==========================================
// 2. Coupons (ADM-07 - 09)
// ==========================================

// ADM-07: GET /admin/coupons
adminRouter.get('/coupons', requireRole('superAdmin'), listCoupons);

// ADM-08: POST /admin/coupons
adminRouter.post('/coupons', requireRole('superAdmin'), createCoupon);

// ADM-09: PATCH /admin/coupons/:id
adminRouter.patch('/coupons/:id', requireRole('superAdmin'), updateCoupon);

// ==========================================
// 3. Content Pages (ADM-10)
// ==========================================

adminRouter.get('/content/pages', requireRole('superAdmin'), listPages);
adminRouter.post('/content/pages', requireRole('superAdmin'), createPage);
adminRouter.patch('/content/pages/:id', requireRole('superAdmin'), updatePage);

// ==========================================
// 4. Site Configuration (ADM-11 - 12)
// ==========================================

// ADM-11: POST /admin/homepage/config
adminRouter.post('/homepage/config', requireRole('superAdmin'), updateHomepageConfig);

// ADM-12: POST /admin/navigation/config
adminRouter.post('/navigation/config', requireRole('superAdmin'), updateNavigationConfig);
