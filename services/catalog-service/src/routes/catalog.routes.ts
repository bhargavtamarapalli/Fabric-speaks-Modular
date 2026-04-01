import { Router } from 'express';
import { requireAuth, requireRole, getDbPool, getRedisClient } from '@fs/shared';
import { CatalogController } from '../controllers/catalog.controller';
import { CatalogService } from '../services/catalog.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { PriceChangeService } from '../services/price-change.service';
import { ProductRepository } from '../repositories/product.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { BrandRepository } from '../repositories/brand.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { VariantTemplateRepository } from '../repositories/variant_template.repository';
import { PriceChangeRepository } from '../repositories/price-change.repository';
import { Queue } from 'bullmq';

export const catalogRouter = Router();

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
const priceChangeService = new PriceChangeService(priceChangeRepo, variantRepo, auditLogRepo, priceChangeQueue);
const catalogController = new CatalogController(catalogService, bulkUploadService, priceChangeService);

// Public routes
catalogRouter.get('/products', catalogController.listProducts);
catalogRouter.get('/products/:slug', catalogController.getProduct);
catalogRouter.get('/brands', catalogController.listBrands);
catalogRouter.get('/categories', catalogController.listCategories);
catalogRouter.get('/collections/:slug', catalogController.getCollection);

// Admin routes
catalogRouter.get('/admin/products', requireAuth, requireRole('superAdmin', 'inventoryManager', 'supportAgent'), catalogController.adminListProducts);
catalogRouter.get('/admin/brands', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.adminListBrands);
catalogRouter.get('/admin/categories', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.adminListCategories);
catalogRouter.get('/admin/collections', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.adminListCollections);
catalogRouter.post('/admin/products', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createProduct);
catalogRouter.patch('/admin/products/:id', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.updateProduct);
catalogRouter.post('/admin/products/:id/variants', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createVariant);
catalogRouter.patch('/admin/products/:id/variants/bulk', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.bulkUpdateVariants);
catalogRouter.patch('/admin/variants/:variantId', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.updateVariant);
catalogRouter.delete('/admin/variants/:variantId', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.deactivateVariant);
catalogRouter.delete('/admin/products/:id', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.deleteProduct);
catalogRouter.post('/admin/products/:id/deactivate', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.deactivateProduct);
catalogRouter.post('/admin/products/:id/duplicate', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.duplicateProduct);
catalogRouter.post('/admin/products/bulk-upload', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.bulkUpload);
catalogRouter.get('/admin/products/bulk-upload/template', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.getBulkTemplate);
catalogRouter.post('/admin/pricing/bulk-update', requireAuth, requireRole('superAdmin'), catalogController.bulkPriceUpdate);
catalogRouter.post('/admin/pricing/schedule', requireAuth, requireRole('superAdmin'), catalogController.schedulePriceChange);
catalogRouter.get('/admin/pricing/schedule', requireAuth, requireRole('superAdmin'), catalogController.listScheduledPriceChanges);
catalogRouter.post('/admin/brands', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createBrand);
catalogRouter.patch('/admin/brands/:id', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.updateBrand);

catalogRouter.post('/admin/categories', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createCategory);
catalogRouter.patch('/admin/categories/:id', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.updateCategory);

catalogRouter.post('/admin/collections', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createCollection);
catalogRouter.patch('/admin/collections/:id', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.updateCollection);
catalogRouter.post('/admin/collections/:id/products', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.addCollectionProducts);
catalogRouter.delete('/admin/collections/:id/products/:productId', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.removeCollectionProduct);
catalogRouter.put('/admin/collections/:id/products/reorder', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.reorderCollectionProducts);

// Variant Template routes
catalogRouter.get('/admin/catalog/templates', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.listVariantTemplates);
catalogRouter.post('/admin/catalog/templates', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createVariantTemplate);
