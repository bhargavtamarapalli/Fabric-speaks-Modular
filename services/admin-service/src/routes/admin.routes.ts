import { Router } from 'express';
import { getDbPool, getRedisClient, requireAuth, requireRole } from '@fs/shared';

// Repositories
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { PageRepository } from '../repositories/page.repository';
import { ConfigRepository } from '../repositories/config.repository';
import { SettingsRepository } from '../repositories/settings.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { BannerRepository } from '../repositories/banner.repository';
import { SaleEventRepository } from '../repositories/sale-event.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';

// Services
import { AdminService } from '../services/admin.service';
import { CouponService } from '../services/coupon.service';
import { PageService } from '../services/page.service';
import { ConfigService } from '../services/config.service';
import { SettingsService } from '../services/settings.service';
import { BannerService } from '../services/banner.service';
import { SaleEventService } from '../services/sale-event.service';

// Controllers
import { AdminController } from '../controllers/admin.controller';
import { CouponController } from '../controllers/coupon.controller';
import { PageController } from '../controllers/page.controller';
import { ConfigController } from '../controllers/config.controller';
import { SettingsController } from '../controllers/settings.controller';
import { BannerController } from '../controllers/banner.controller';
import { SaleEventController } from '../controllers/sale-event.controller';

const router = Router();
const db = getDbPool();
const redis = getRedisClient();

// Wiring
const adminUserRepo = new AdminUserRepository(db);
const customerRepo = new CustomerRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const dashboardRepo = new DashboardRepository(db);
const adminService = new AdminService(adminUserRepo, customerRepo, auditLogRepo, dashboardRepo);
const adminController = new AdminController(adminService);

const couponRepo = new CouponRepository(db);
const couponService = new CouponService(couponRepo, auditLogRepo);
const couponController = new CouponController(couponService);

const pageRepo = new PageRepository(db);
const pageService = new PageService(pageRepo, auditLogRepo);
const pageController = new PageController(pageService);

const configRepo = new ConfigRepository(db);
const configService = new ConfigService(configRepo, auditLogRepo, redis);
const configController = new ConfigController(configService);

const settingsRepo = new SettingsRepository(db);
const settingsService = new SettingsService(settingsRepo, auditLogRepo);
const settingsController = new SettingsController(settingsService);

const bannerRepo = new BannerRepository(db);
const bannerService = new BannerService(bannerRepo, auditLogRepo);
const bannerController = new BannerController(bannerService);

const saleEventRepo = new SaleEventRepository(db);
const saleEventService = new SaleEventService(saleEventRepo, auditLogRepo);
const saleEventController = new SaleEventController(saleEventService);

// Public settings (Storefront) - must be before requireAuth
router.get('/settings/public', settingsController.getPublicSettings);

// Global middleware for whole admin suite ingress
router.use(requireAuth);

// ADM-01 - ADM-06
router.get('/users', requireRole('superAdmin'), adminController.listAdminUsers);
router.post('/users', requireRole('superAdmin'), adminController.createAdminUser);
router.patch('/users/:id/role', requireRole('superAdmin'), adminController.updateAdminRole);
router.delete('/users/:id', requireRole('superAdmin'), adminController.deleteAdminUser);
router.get('/audit-log', requireRole('superAdmin'), adminController.getAuditLogs);
router.get('/dashboard/ops', requireRole('superAdmin', 'supportAgent'), adminController.getDashboardOps);
router.get('/customers/lookup', requireRole('superAdmin', 'supportAgent'), adminController.lookupCustomers);

// ADM-07 - ADM-09 (Coupons)
router.get('/coupons', requireRole('superAdmin'), couponController.listCoupons);
router.post('/coupons', requireRole('superAdmin'), couponController.createCoupon);
router.patch('/coupons/:id', requireRole('superAdmin'), couponController.updateCoupon);

// ADM-10 (Content Pages)
router.get('/content/pages', requireRole('superAdmin'), pageController.listPages);
router.post('/content/pages', requireRole('superAdmin'), pageController.createPage);
router.patch('/content/pages/:id', requireRole('superAdmin'), pageController.updatePage);

// ADM-11 - ADM-12 (Site Configuration)
router.patch('/homepage', requireRole('superAdmin'), configController.updateHomepageConfig);
router.put('/navigation', requireRole('superAdmin'), configController.updateNavigationConfig);

// SET-01 - SET-02 (Store Settings)
router.get('/settings', requireRole('superAdmin'), settingsController.getAllSettings);
router.patch('/settings', requireRole('superAdmin'), settingsController.updateSetting);

// LSC-04 (Banners)
router.get('/content/banners', requireRole('superAdmin'), bannerController.listBanners);
router.post('/content/banners', requireRole('superAdmin'), bannerController.createBanner);
router.patch('/content/banners/:id', requireRole('superAdmin'), bannerController.updateBanner);
router.delete('/content/banners/:id', requireRole('superAdmin'), bannerController.deleteBanner);

// PRC-10 - PRC-11 (Sale Events)
router.get('/content/sales', requireRole('superAdmin'), saleEventController.listSaleEvents);
router.post('/content/sales', requireRole('superAdmin'), saleEventController.createSaleEvent);
router.patch('/content/sales/:id', requireRole('superAdmin'), saleEventController.updateSaleEvent);
router.delete('/content/sales/:id', requireRole('superAdmin'), saleEventController.deleteSaleEvent);

// GET methods for homepage/nav
router.get('/homepage', requireRole('superAdmin'), configController.getHomepageConfig);
router.get('/navigation', requireRole('superAdmin'), configController.getNavigationConfig);

export default router;
