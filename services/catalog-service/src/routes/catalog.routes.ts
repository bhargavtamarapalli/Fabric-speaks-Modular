import { Router } from 'express';
import { Queue } from 'bullmq';
import { requireAuth, requireRole, getDbPool, getRedisClient, rateLimit } from '@fs/shared';
import { CatalogController } from '../controllers/catalog.controller';
import { CatalogService } from '../services/catalog.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { PriceChangeService } from '../services/price-change.service';
import { AuditService } from '../services/audit.service';
import { ProductRepository } from '../repositories/product.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { BrandRepository } from '../repositories/brand.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { VariantTemplateRepository } from '../repositories/variant_template.repository';
import { PriceChangeRepository } from '../repositories/price-change.repository';

export const catalogRouter = Router();

const v1Router = Router();

// Dependency Injection
const db = getDbPool();
const redis = getRedisClient();
const productRepo = new ProductRepository(db);
const variantRepo = new VariantRepository(db);
const brandRepo = new BrandRepository(db);
const categoryRepo = new CategoryRepository(db);
const collectionRepo = new CollectionRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const variantTemplateRepo = new VariantTemplateRepository(db);
const priceChangeRepo = new PriceChangeRepository(db);

const catalogService = new CatalogService(
  productRepo,
  variantRepo,
  brandRepo,
  categoryRepo,
  collectionRepo,
  variantTemplateRepo,
  auditLogRepo,
  redis
);

const bulkUploadQueue = new Queue('bulk-upload', { connection: redis });
const priceChangeQueue = new Queue('price_changes', { connection: redis });
const bulkUploadService = new BulkUploadService(bulkUploadQueue, auditLogRepo);
const priceChangeService = new PriceChangeService(
  priceChangeRepo,
  variantRepo,
  auditLogRepo,
  priceChangeQueue
);
const auditService = new AuditService(auditLogRepo);
const catalogController = new CatalogController(
  catalogService,
  bulkUploadService,
  priceChangeService,
  auditService
);

// Public routes
v1Router.get('/products', catalogController.listProducts);
v1Router.get('/products/:slug', catalogController.getProduct);
v1Router.get('/brands', catalogController.listBrands);
v1Router.get('/categories', catalogController.listCategories);
v1Router.get('/collections/:slug', catalogController.getCollection);

// Admin routes
v1Router.get(
  '/admin/products',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager', 'supportAgent'),
  catalogController.adminListProducts
);
v1Router.get(
  '/admin/brands',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.adminListBrands
);
v1Router.get(
  '/admin/categories',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.adminListCategories
);
v1Router.get(
  '/admin/collections',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.adminListCollections
);
v1Router.post(
  '/admin/products',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.createProduct
);
v1Router.put(
  '/admin/products/:id',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.updateProduct
);
v1Router.post(
  '/admin/products/:id/variants',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.createVariant
);
v1Router.put(
  '/admin/products/:id/variants/bulk',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  // PHASE 2 - Task 2.4: Rate Limiting - Limit bulk variant updates to 10 per minute per user
  rateLimit({ windowMs: 60000, max: 10 }),
  catalogController.bulkUpdateVariants
);
v1Router.put(
  '/admin/variants/:variantId',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.updateVariant
);
v1Router.delete(
  '/admin/variants/:variantId',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.deactivateVariant
);
v1Router.delete(
  '/admin/products/:id',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.deleteProduct
);
v1Router.put(
  '/admin/products/:id/deactivate',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.deactivateProduct
);
v1Router.post(
  '/admin/products/:id/duplicate',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.duplicateProduct
);
v1Router.post(
  '/admin/products/bulk-upload',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  // PHASE 2 - Task 2.4: Rate Limiting - Limit bulk uploads to 5 per minute per user
  rateLimit({ windowMs: 60000, max: 5 }),
  catalogController.bulkUpload
);
v1Router.get(
  '/admin/products/bulk-upload/template',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.getBulkTemplate
);
v1Router.put(
  '/admin/pricing/bulk-update',
  requireAuth,
  requireRole('superAdmin'),
  // PHASE 2 - Task 2.4: Rate Limiting - Limit bulk price updates to 5 per minute per user
  rateLimit({ windowMs: 60000, max: 5 }),
  catalogController.bulkPriceUpdate
);
v1Router.post(
  '/admin/pricing/schedule',
  requireAuth,
  requireRole('superAdmin'),
  catalogController.schedulePriceChange
);
v1Router.get(
  '/admin/pricing/schedule',
  requireAuth,
  requireRole('superAdmin'),
  catalogController.listScheduledPriceChanges
);
v1Router.post(
  '/admin/brands',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.createBrand
);
v1Router.put(
  '/admin/brands/:id',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.updateBrand
);

v1Router.post(
  '/admin/categories',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.createCategory
);
v1Router.put(
  '/admin/categories/:id',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.updateCategory
);

v1Router.post(
  '/admin/collections',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.createCollection
);
v1Router.put(
  '/admin/collections/:id',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.updateCollection
);
v1Router.post(
  '/admin/collections/:id/products',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.addCollectionProducts
);
v1Router.delete(
  '/admin/collections/:id/products/:productId',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.removeCollectionProduct
);
v1Router.put(
  '/admin/collections/:id/products/reorder',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.reorderCollectionProducts
);

// Variant Template routes
v1Router.get(
  '/admin/catalog/templates',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.listVariantTemplates
);
v1Router.post(
  '/admin/catalog/templates',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.createVariantTemplate
);
v1Router.put(
  '/admin/catalog/templates/:id',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.updateVariantTemplate
);
v1Router.delete(
  '/admin/catalog/templates/:id',
  requireAuth,
  requireRole('superAdmin', 'inventoryManager'),
  catalogController.deleteVariantTemplate
);
v1Router.post(
  '/admin/catalog/cleanup-meter-sizes',
  requireAuth,
  requireRole('superAdmin'),
  catalogController.cleanupMeterSizes
);

catalogRouter.use('/v1', v1Router);
catalogRouter.use(
  '/',
  (req, res, next) => {
    res.setHeader('X-Api-Deprecated', 'true');
    next();
  },
  v1Router
);
