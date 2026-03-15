import { Router } from 'express';
import { requireAuth, requireRole, getDbPool, getRedisClient } from '@fs/shared';
import { CatalogController } from '../controllers/catalog.controller';
import { CatalogService } from '../services/catalog.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { ProductRepository } from '../repositories/product.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { BrandRepository } from '../repositories/brand.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
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

const catalogService = new CatalogService(
    productRepo,
    variantRepo,
    brandRepo,
    categoryRepo,
    collectionRepo,
    auditLogRepo,
    redis
);

const bulkUploadQueue = new Queue('bulk-upload', { connection: redis });
const bulkUploadService = new BulkUploadService(bulkUploadQueue, auditLogRepo);
const catalogController = new CatalogController(catalogService, bulkUploadService);

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
catalogRouter.post('/admin/brands', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createBrand);
catalogRouter.patch('/admin/brands/:id', requireAuth, requireRole('superAdmin'), catalogController.updateBrand);

catalogRouter.post('/admin/categories', requireAuth, requireRole('superAdmin'), catalogController.createCategory);
catalogRouter.patch('/admin/categories/:id', requireAuth, requireRole('superAdmin'), catalogController.updateCategory);

catalogRouter.post('/admin/collections', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.createCollection);
catalogRouter.patch('/admin/collections/:id', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.updateCollection);
catalogRouter.post('/admin/collections/:id/products', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.addCollectionProducts);
catalogRouter.delete('/admin/collections/:id/products/:productId', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.removeCollectionProduct);
catalogRouter.put('/admin/collections/:id/products/reorder', requireAuth, requireRole('superAdmin', 'inventoryManager'), catalogController.reorderCollectionProducts);
