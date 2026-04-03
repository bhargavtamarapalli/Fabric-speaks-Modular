import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, ErrorCode, catchAsync, Feature, PermissionLevel, PERMISSION_MATRIX, roleToRoleName } from '@fs/shared';
import { CatalogService } from '../services/catalog.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { PriceChangeService } from '../services/price-change.service';
import { AuditService } from '../services/audit.service';
import {
  ProductQuerySchema,
  CreateProductSchema,
  UpdateProductSchema,
  CreateBrandSchema,
  UpdateBrandSchema,
  CreateCollectionSchema,
  BulkUploadRequestSchema,
  AdminProductQuerySchema,
  DeactivateProductSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  UpdateCollectionSchema,
  ReorderCollectionProductsSchema,
  IdParamSchema,
  BulkUpdateVariantsSchema,
  CreateVariantSchema,
  UpdateVariantSchema,
  VariantIdParamSchema,
  BulkPriceUpdateSchema,
  SchedulePriceChangeSchema,
  PriceChangeListQuerySchema,
  CreateVariantTemplateSchema,
  AddCollectionProductsSchema,
  VariantTemplateQuerySchema,
} from '../schemas/catalog.schemas';

export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly bulkUploadService: BulkUploadService,
    private readonly priceChangeService: PriceChangeService,
    private readonly auditService: AuditService
  ) {}

  /**
   * PHASE 2 - Task 2.6: Audit Logging
   * Extract IP address from request (supports X-Forwarded-For for proxies)
   */
  private getIpAddress(req: Request): string | undefined {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      undefined
    );
  }

  /**
   * PHASE 2 - Task 2.2: Authorization Layer
   * Check if user has permission to perform an action on a feature
   */
  private requirePermission(req: Request, feature: Feature, requiredLevel: PermissionLevel): void {
    if (!req.user || !req.user.role) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userRole = req.user.role.toLowerCase() as any;
    const roleName = roleToRoleName[userRole];

    if (!roleName) {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Invalid user role');
    }

    const rolePermissions = PERMISSION_MATRIX[roleName];
    if (!rolePermissions) {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'User role has no permissions defined');
    }

    const featurePermissions = rolePermissions[feature];
    if (!featurePermissions || !featurePermissions.includes(requiredLevel)) {
      throw new AppError(
        ErrorCode.INSUFFICIENT_ROLE,
        `You do not have ${requiredLevel} permission for ${feature}`
      );
    }
  }

  listProducts = catchAsync(async (req: Request, res: Response) => {
    const query = ProductQuerySchema.parse(req.query);
    const result = await this.catalogService.listProducts(query);
    if ('hasNext' in result) {
      const nextCursor = result.items.length > 0 ? result.items[result.items.length - 1].id : null;
      res.json({
        success: true,
        data: result.items,
        meta: { hasNext: result.hasNext, nextCursor, limit: query.limit },
      });
    } else {
      res.json({
        success: true,
        data: result.items,
        meta: { total: result.total, page: query.page, limit: query.limit },
      });
    }
  });

  getProduct = catchAsync(async (req: Request, res: Response) => {
    const result = await this.catalogService.getProductBySlug(req.params.slug!);
    res.json({ success: true, data: result });
  });

  listBrands = catchAsync(async (req: Request, res: Response) => {
    const query = { page: 1, limit: 1000, ...req.query };
    const result = await this.catalogService.listBrands();
    res.json({
      success: true,
      data: { items: result.items },
      meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) },
    });
  });

  adminListBrands = catchAsync(async (req: Request, res: Response) => {
    const query = { page: 1, limit: 1000, ...req.query };
    const result = await this.catalogService.adminListBrands();
    res.json({
      success: true,
      data: { items: result.items },
      meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) },
    });
  });

  listCategories = catchAsync(async (req: Request, res: Response) => {
    const query = { page: 1, limit: 1000, ...req.query };
    const result = await this.catalogService.listCategories();
    res.json({
      success: true,
      data: { items: result.items },
      meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) },
    });
  });

  adminListCategories = catchAsync(async (req: Request, res: Response) => {
    const query = { page: 1, limit: 1000, ...req.query };
    const result = await this.catalogService.adminListCategories();
    res.json({
      success: true,
      data: { items: result.items },
      meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) },
    });
  });

  getCollection = catchAsync(async (req: Request, res: Response) => {
    const result = await this.catalogService.getCollection(req.params.slug!);
    res.json({ success: true, data: result });
  });

  adminListCollections = catchAsync(async (req: Request, res: Response) => {
    const query = { page: 1, limit: 1000, ...req.query };
    const result = await this.catalogService.adminListCollections();
    res.json({
      success: true,
      data: { items: result.items },
      meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) },
    });
  });

  adminListProducts = catchAsync(async (req: Request, res: Response) => {
    const query = AdminProductQuerySchema.parse(req.query);
    const result = await this.catalogService.adminListProducts(query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: query.page, limit: query.limit },
    });
  });

  createProduct = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check CREATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.CREATE);

    const dto = CreateProductSchema.parse(req.body);
    const result = await this.catalogService.createProduct(dto, req.user!.userId);
    
    // PHASE 2 - Task 2.6: Audit Logging - Log product creation
    await this.auditService.logCreate(
      req.user!.userId,
      'PRODUCT',
      result.id,
      result,
      this.getIpAddress(req)
    );
    
    res.status(201).json({ success: true, data: result });
  });

  updateProduct = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    const { id } = IdParamSchema.parse(req.params);
    const dto = UpdateProductSchema.parse(req.body);
    
    // Get before state for audit
    const beforeData = await this.catalogService.getProductById(id);
    const result = await this.catalogService.updateProduct(id, dto, req.user!.userId);
    
    // PHASE 2 - Task 2.6: Audit Logging - Log product update
    await this.auditService.logUpdate(
      req.user!.userId,
      'PRODUCT',
      id,
      beforeData,
      result,
      this.getIpAddress(req)
    );
    
    res.json({ success: true, data: result });
  });

  bulkUpdateVariants = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission for products
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    const { id } = IdParamSchema.parse(req.params);
    const dto = BulkUpdateVariantsSchema.parse(req.body);
    
    // PHASE 2 - Task 2.3: Dry-Run Preview feature
    const dryRun = req.query.dryRun === 'true';
    
    // PHASE 1 - Task 1.4: Check idempotency key to prevent duplicate processing
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey && !dryRun) {  // Don't cache dryRun requests
      const cached = await this.redis.get(`bulk_update:${idempotencyKey}`);
      if (cached) {
        // Return cached result to prevent duplicates
        res.json({ success: true, data: JSON.parse(cached), cached: true });
        return;
      }
    }

    const result = await this.catalogService.bulkUpdateVariants(
      id,
      dto.variants,
      req.user!.userId,
      idempotencyKey,
      dryRun
    );

    // Cache result for idempotency (only for non-dryRun requests)
    if (idempotencyKey && !dryRun) {
      await this.redis.setex(
        `bulk_update:${idempotencyKey}`,
        3600, // 1 hour TTL
        JSON.stringify(result)
      );
    }

    res.json({ success: true, data: result });
  });

  createVariant = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check CREATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.CREATE);

    const { id } = IdParamSchema.parse(req.params);
    const dto = CreateVariantSchema.parse(req.body);
    const result = await this.catalogService.createVariant(id, dto, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  });

  updateVariant = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    const { variantId } = VariantIdParamSchema.parse(req.params);
    const dto = UpdateVariantSchema.parse(req.body);
    const result = await this.catalogService.updateVariant(variantId, dto, req.user!.userId);
    res.json({ success: true, data: result });
  });

  deactivateVariant = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    const { variantId } = VariantIdParamSchema.parse(req.params);
    const result = await this.catalogService.deactivateVariant(variantId, req.user!.userId);
    res.json({ success: true, data: result });
  });

  deleteProduct = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check DELETE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.DELETE);

    const { id } = IdParamSchema.parse(req.params);
    
    // Get before state for audit
    const deletedData = await this.catalogService.getProductById(id);
    await this.catalogService.deleteProduct(id, req.user!.userId);
    
    // PHASE 2 - Task 2.6: Audit Logging - Log product deletion
    await this.auditService.logDelete(
      req.user!.userId,
      'PRODUCT',
      id,
      deletedData,
      this.getIpAddress(req)
    );
    
    res.json({ success: true });
  });

  duplicateProduct = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check CREATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.CREATE);

    const { id } = IdParamSchema.parse(req.params);
    const result = await this.catalogService.duplicateProduct(id, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  });

  deactivateProduct = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    const { id } = IdParamSchema.parse(req.params);
    const dto = DeactivateProductSchema.parse(req.body);
    const result = await this.catalogService.deactivateProduct(id, dto, req.user!.userId);
    res.json({ success: true, data: result });
  });

  bulkUpload = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check CREATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.CREATE);

    // PHASE 2 - Task 2.4: Rate limiting now handled at route middleware level
    const { csvData, dryRun } = BulkUploadRequestSchema.parse(req.body);
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (csvData.length > maxSize) {
      throw new AppError(ErrorCode.BULK_UPLOAD_LIMIT, 'CSV file size exceeds 10MB limit');
    }
    const result = await this.bulkUploadService.queueUpload(csvData, req.user!.userId, dryRun);

    res.status(200).json({ success: true, data: result });
  });

  bulkPriceUpdate = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    // PHASE 2 - Task 2.4: Rate limiting now handled at route middleware level
    const dto = BulkPriceUpdateSchema.parse(req.body);
    const result = await this.catalogService.bulkUpdatePrices(dto, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  });

  schedulePriceChange = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    const dto = SchedulePriceChangeSchema.parse(req.body);
    const scheduled = await this.priceChangeService.schedulePriceChange(
      {
        targetType: dto.targetType,
        targetIds: dto.targetIds,
        adjustmentType: dto.adjustmentType,
        adjustmentValue: dto.adjustmentValue,
        applyTo: dto.applyTo,
        scheduledAt: new Date(dto.scheduledAt),
        createdBy: req.user!.userId,
      },
      req.user!.userId
    );
    res.status(201).json({ success: true, data: scheduled });
  });

  listScheduledPriceChanges = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check READ permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.READ);

    const query = PriceChangeListQuerySchema.parse(req.query);
    const items = await this.priceChangeService.listScheduled(query);
    res.status(200).json({ success: true, data: { items }, meta: query });
  });

  getBulkTemplate = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check READ permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.READ);

    const template = this.bulkUploadService.getTemplateCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=catalog_template.csv');
    res.send(template);
  });

  createBrand = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check CREATE permission for catalog
    // Brands are part of catalog management, so use PRODUCTS feature
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.CREATE);

    const dto = CreateBrandSchema.parse(req.body);
    const result = await this.catalogService.createBrand(dto, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  });

  updateBrand = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.PRODUCTS, PermissionLevel.UPDATE);

    const { id } = IdParamSchema.parse(req.params);
    const dto = UpdateBrandSchema.parse(req.body);
    const result = await this.catalogService.updateBrand(id, dto, req.user!.userId);
    res.json({ success: true, data: result });
  });

  createCollection = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check CREATE permission
    this.requirePermission(req, Feature.COLLECTIONS, PermissionLevel.CREATE);

    const dto = CreateCollectionSchema.parse(req.body);
    const result = await this.catalogService.createCollection(dto, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  });

  createCategory = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check CREATE permission
    this.requirePermission(req, Feature.CATEGORIES, PermissionLevel.CREATE);

    const dto = CreateCategorySchema.parse(req.body);
    const result = await this.catalogService.createCategory(dto, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  });

  updateCategory = catchAsync(async (req: Request, res: Response) => {
    // PHASE 2 - Task 2.2: Authorization Layer - Check UPDATE permission
    this.requirePermission(req, Feature.CATEGORIES, PermissionLevel.UPDATE);

    const { id } = IdParamSchema.parse(req.params);
    const dto = UpdateCategorySchema.parse(req.body);
    const result = await this.catalogService.updateCategory(id, dto, req.user!.userId);
    res.json({ success: true, data: result });
  });

  updateCollection = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const dto = UpdateCollectionSchema.parse(req.body);
    const result = await this.catalogService.updateCollection(id, dto, req.user!.userId);
    res.json({ success: true, data: result });
  });

  addCollectionProducts = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const { productIds } = AddCollectionProductsSchema.parse(req.body);
    const result = await this.catalogService.addCollectionProducts(
      id,
      productIds,
      req.user!.userId
    );
    res.json({ success: true, data: result });
  });

  removeCollectionProduct = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const productId = z.string().uuid().parse(req.params.productId);
    const result = await this.catalogService.removeCollectionProduct(
      id,
      productId,
      req.user!.userId
    );
    res.json({ success: true, data: result });
  });

  reorderCollectionProducts = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const { productIds } = ReorderCollectionProductsSchema.parse(req.body);
    await this.catalogService.reorderCollectionProducts(id, productIds, req.user!.userId);
    res.json({ success: true, data: { collectionId: id, productIds } });
  });

  listVariantTemplates = catchAsync(async (req: Request, res: Response) => {
    const query = VariantTemplateQuerySchema.parse(req.query);
    const result = await this.catalogService.listVariantTemplates();
    res.json({
      success: true,
      data: { items: result.items },
      meta: { total: result.total, page: query.page, limit: query.limit },
    });
  });

  createVariantTemplate = catchAsync(async (req: Request, res: Response) => {
    const dto = CreateVariantTemplateSchema.parse(req.body);
    const result = await this.catalogService.createVariantTemplate(dto, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  });

  updateVariantTemplate = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const dto = z
      .object({
        sizes: z.array(z.string()).optional(),
        colours: z.array(z.string()).optional(),
      })
      .parse(req.body);
    const result = await this.catalogService.updateVariantTemplate(id, dto, req.user!.userId);
    res.json({ success: true, data: result });
  });

  deleteVariantTemplate = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    await this.catalogService.deleteVariantTemplate(id, req.user!.userId);
    res.status(204).end();
  });

  cleanupMeterSizes = catchAsync(async (req: Request, res: Response) => {
    const result = await this.catalogService.cleanupMeterSizes(req.user!.userId);
    res.json({ success: true, data: result });
  });
}
