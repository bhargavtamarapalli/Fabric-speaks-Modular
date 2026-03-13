import { Router } from 'express';
import { getDbPool, requireAuth, requireRole } from '@fs/shared';

// Repositories
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { PageRepository } from '../repositories/page.repository';
import { ConfigRepository } from '../repositories/config.repository';

// Services
import { AdminService } from '../services/admin.service';
import { CouponService } from '../services/coupon.service';
import { PageService } from '../services/page.service';
import { ConfigService } from '../services/config.service';

// Controllers
import { AdminController } from '../controllers/admin.controller';
import { CouponController } from '../controllers/coupon.controller';
import { PageController } from '../controllers/page.controller';
import { ConfigController } from '../controllers/config.controller';

const router = Router();
const db = getDbPool();

// Wiring
const adminUserRepo = new AdminUserRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const adminService = new AdminService(adminUserRepo, auditLogRepo);
const adminController = new AdminController(adminService);

const couponRepo = new CouponRepository(db);
const couponService = new CouponService(couponRepo);
const couponController = new CouponController(couponService);

const pageRepo = new PageRepository(db);
const pageService = new PageService(pageRepo);
const pageController = new PageController(pageService);

const configRepo = new ConfigRepository(db);
const configService = new ConfigService(configRepo);
const configController = new ConfigController(configService);

// Global middleware for whole admin suite ingress
router.use(requireAuth);

// ADM-01 - ADM-06
router.get('/users', requireRole('superAdmin'), adminController.listAdminUsers);
router.post('/users', requireRole('superAdmin'), adminController.createAdminUser);
router.patch('/users/:id/role', requireRole('superAdmin'), adminController.updateAdminRole);
router.delete('/users/:id', requireRole('superAdmin'), adminController.deleteAdminUser);
router.get('/audit-log', requireRole('superAdmin'), adminController.getAuditLogs);
router.get('/dashboard/ops', requireRole('superAdmin', 'supportAgent'), adminController.getDashboardOps);

// ADM-07 - ADM-09 (Coupons)
router.get('/coupons', requireRole('superAdmin'), couponController.listCoupons);
router.post('/coupons', requireRole('superAdmin'), couponController.createCoupon);
router.patch('/coupons/:id', requireRole('superAdmin'), couponController.updateCoupon);

// ADM-10 (Content Pages)
router.get('/content/pages', requireRole('superAdmin'), pageController.listPages);
router.post('/content/pages', requireRole('superAdmin'), pageController.createPage);
router.patch('/content/pages/:id', requireRole('superAdmin'), pageController.updatePage);

// ADM-11 - ADM-12 (Site Configuration)
router.post('/homepage/config', requireRole('superAdmin'), configController.updateHomepageConfig);
router.post('/navigation/config', requireRole('superAdmin'), configController.updateNavigationConfig);

export default router;
