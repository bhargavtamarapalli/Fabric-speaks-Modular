import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';
import { CatalogService } from '../services/catalog.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { PriceChangeService } from '../services/price-change.service';
import { ProductQuerySchema, CreateProductSchema, UpdateProductSchema, CreateBrandSchema, UpdateBrandSchema, CreateCollectionSchema, BulkUploadRequestSchema, AdminProductQuerySchema, DeactivateProductSchema, CreateCategorySchema, UpdateCategorySchema, UpdateCollectionSchema, ReorderCollectionProductsSchema, IdParamSchema, BulkUpdateVariantsSchema, CreateVariantSchema, UpdateVariantSchema, VariantIdParamSchema, BulkPriceUpdateSchema, SchedulePriceChangeSchema, PriceChangeListQuerySchema, CreateVariantTemplateSchema, AddCollectionProductsSchema, VariantTemplateQuerySchema } from '../schemas/catalog.schemas';

export class CatalogController {
    constructor(
        private readonly catalogService: CatalogService,
        private readonly bulkUploadService: BulkUploadService,
        private readonly priceChangeService: PriceChangeService
    ) {}

    listProducts = catchAsync(async (req: Request, res: Response) => {
        const query = ProductQuerySchema.parse(req.query);
        const result = await this.catalogService.listProducts(query);
        res.json({ success: true, data: result.items, meta: { total: result.total, page: query.page, limit: query.limit } });
    });

    getProduct = catchAsync(async (req: Request, res: Response) => {
        const result = await this.catalogService.getProductBySlug(req.params.slug!);
        res.json({ success: true, data: result });
    });

    listBrands = catchAsync(async (req: Request, res: Response) => {
        const query = { page: 1, limit: 1000, ...req.query };
        const result = await this.catalogService.listBrands();
        res.json({ success: true, data: { items: result.items }, meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) } });
    });

    adminListBrands = catchAsync(async (req: Request, res: Response) => {
        const query = { page: 1, limit: 1000, ...req.query };
        const result = await this.catalogService.adminListBrands();
        res.json({ success: true, data: { items: result.items }, meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) } });
    });

    listCategories = catchAsync(async (req: Request, res: Response) => {
        const query = { page: 1, limit: 1000, ...req.query };
        const result = await this.catalogService.listCategories();
        res.json({ success: true, data: { items: result.items }, meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) } });
    });

    adminListCategories = catchAsync(async (req: Request, res: Response) => {
        const query = { page: 1, limit: 1000, ...req.query };
        const result = await this.catalogService.adminListCategories();
        res.json({ success: true, data: { items: result.items }, meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) } });
    });

    getCollection = catchAsync(async (req: Request, res: Response) => {
        const result = await this.catalogService.getCollection(req.params.slug!);
        res.json({ success: true, data: result });
    });

    adminListCollections = catchAsync(async (req: Request, res: Response) => {
        const query = { page: 1, limit: 1000, ...req.query };
        const result = await this.catalogService.adminListCollections();
        res.json({ success: true, data: { items: result.items }, meta: { total: result.total, page: Number(query.page), limit: Number(query.limit) } });
    });

    adminListProducts = catchAsync(async (req: Request, res: Response) => {
        const query = AdminProductQuerySchema.parse(req.query);
        const result = await this.catalogService.adminListProducts(query);
        res.json({ success: true, data: result.items, meta: { total: result.total, page: query.page, limit: query.limit } });
    });

    createProduct = catchAsync(async (req: Request, res: Response) => {
        const dto = CreateProductSchema.parse(req.body);
        const result = await this.catalogService.createProduct(dto, req.user!.userId);
        res.status(201).json({ success: true, data: result });
    });

    updateProduct = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const dto = UpdateProductSchema.parse(req.body);
        const result = await this.catalogService.updateProduct(id, dto, req.user!.userId);
        res.json({ success: true, data: result });
    });

    bulkUpdateVariants = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const dto = BulkUpdateVariantsSchema.parse(req.body);
        const result = await this.catalogService.bulkUpdateVariants(id, dto.variants, req.user!.userId);
        res.json({ success: true, data: result });
    });

    createVariant = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const dto = CreateVariantSchema.parse(req.body);
        const result = await this.catalogService.createVariant(id, dto, req.user!.userId);
        res.status(201).json({ success: true, data: result });
    });

    updateVariant = catchAsync(async (req: Request, res: Response) => {
        const { variantId } = VariantIdParamSchema.parse(req.params);
        const dto = UpdateVariantSchema.parse(req.body);
        const result = await this.catalogService.updateVariant(variantId, dto, req.user!.userId);
        res.json({ success: true, data: result });
    });

    deactivateVariant = catchAsync(async (req: Request, res: Response) => {
        const { variantId } = VariantIdParamSchema.parse(req.params);
        const result = await this.catalogService.deactivateVariant(variantId, req.user!.userId);
        res.json({ success: true, data: result });
    });

    deleteProduct = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        await this.catalogService.deleteProduct(id, req.user!.userId);
        res.json({ success: true });
    });

    duplicateProduct = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const result = await this.catalogService.duplicateProduct(id, req.user!.userId);
        res.status(201).json({ success: true, data: result });
    });

    deactivateProduct = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const dto = DeactivateProductSchema.parse(req.body);
        const result = await this.catalogService.deactivateProduct(id, dto, req.user!.userId);
        res.json({ success: true, data: result });
    });

    bulkUpload = catchAsync(async (req: Request, res: Response) => {
        const { csvData } = BulkUploadRequestSchema.parse(req.body);
        const result = await this.bulkUploadService.queueUpload(csvData, req.user!.userId);
        
        res.status(200).json({ success: true, data: result });
    });

    bulkPriceUpdate = catchAsync(async (req: Request, res: Response) => {
        const dto = BulkPriceUpdateSchema.parse(req.body);
        const result = await this.catalogService.bulkUpdatePrices(dto, req.user!.userId);
        res.status(200).json({ success: true, data: result });
    });

    schedulePriceChange = catchAsync(async (req: Request, res: Response) => {
        const dto = SchedulePriceChangeSchema.parse(req.body);
        const scheduled = await this.priceChangeService.schedulePriceChange({
            targetType: dto.targetType,
            targetIds: dto.targetIds,
            adjustmentType: dto.adjustmentType,
            adjustmentValue: dto.adjustmentValue,
            applyTo: dto.applyTo,
            scheduledAt: new Date(dto.scheduledAt),
            createdBy: req.user!.userId
        }, req.user!.userId);
        res.status(201).json({ success: true, data: scheduled });
    });

    listScheduledPriceChanges = catchAsync(async (req: Request, res: Response) => {
        const query = PriceChangeListQuerySchema.parse(req.query);
        const items = await this.priceChangeService.listScheduled(query);
        res.status(200).json({ success: true, data: { items }, meta: query });
    });

    getBulkTemplate = catchAsync(async (req: Request, res: Response) => {
        const template = this.bulkUploadService.getTemplateCsv();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=catalog_template.csv');
        res.send(template);
    });

    createBrand = catchAsync(async (req: Request, res: Response) => {
        const dto = CreateBrandSchema.parse(req.body);
        const result = await this.catalogService.createBrand(dto, req.user!.userId);
        res.status(201).json({ success: true, data: result });
    });

    updateBrand = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const dto = UpdateBrandSchema.parse(req.body);
        const result = await this.catalogService.updateBrand(id, dto, req.user!.userId);
        res.json({ success: true, data: result });
    });

    createCollection = catchAsync(async (req: Request, res: Response) => {
        const dto = CreateCollectionSchema.parse(req.body);
        const result = await this.catalogService.createCollection(dto, req.user!.userId);
        res.status(201).json({ success: true, data: result });
    });

    createCategory = catchAsync(async (req: Request, res: Response) => {
        const dto = CreateCategorySchema.parse(req.body);
        const result = await this.catalogService.createCategory(dto, req.user!.userId);
        res.status(201).json({ success: true, data: result });
    });

    updateCategory = catchAsync(async (req: Request, res: Response) => {
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
        const result = await this.catalogService.addCollectionProducts(id, productIds, req.user!.userId);
        res.json({ success: true, data: result });
    });

    removeCollectionProduct = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const productId = z.string().uuid().parse(req.params.productId);
        const result = await this.catalogService.removeCollectionProduct(id, productId, req.user!.userId);
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
        res.json({ success: true, data: { items: result.items }, meta: { total: result.total, page: query.page, limit: query.limit } });
    });

    createVariantTemplate = catchAsync(async (req: Request, res: Response) => {
        const dto = CreateVariantTemplateSchema.parse(req.body);
        const result = await this.catalogService.createVariantTemplate(dto, req.user!.userId);
        res.status(201).json({ success: true, data: result });
    });

    updateVariantTemplate = catchAsync(async (req: Request, res: Response) => {
        const { id } = IdParamSchema.parse(req.params);
        const dto = z.object({
            sizes: z.array(z.string()).optional(),
            colours: z.array(z.string()).optional(),
        }).parse(req.body);
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
