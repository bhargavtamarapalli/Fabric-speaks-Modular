import { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogService } from '../services/catalog.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { ProductQuerySchema, CreateProductSchema, UpdateProductSchema, CreateBrandSchema, UpdateBrandSchema, CreateCollectionSchema, BulkUploadRequestSchema, AdminProductQuerySchema, DeactivateProductSchema, CreateCategorySchema, UpdateCategorySchema, UpdateCollectionSchema, ReorderCollectionProductsSchema, IdParamSchema, BulkUpdateVariantsSchema, CreateVariantSchema, UpdateVariantSchema, VariantIdParamSchema } from '../schemas/catalog.schemas';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';

export class CatalogController {
    constructor(
        private readonly catalogService: CatalogService,
        private readonly bulkUploadService: BulkUploadService
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
        const result = await this.catalogService.listBrands();
        res.json({ success: true, data: result });
    });

    adminListBrands = catchAsync(async (_req: Request, res: Response) => {
        const result = await this.catalogService.adminListBrands();
        res.json({ success: true, data: result });
    });

    listCategories = catchAsync(async (req: Request, res: Response) => {
        const result = await this.catalogService.listCategories();
        res.json({ success: true, data: result });
    });

    adminListCategories = catchAsync(async (_req: Request, res: Response) => {
        const result = await this.catalogService.adminListCategories();
        res.json({ success: true, data: result });
    });

    getCollection = catchAsync(async (req: Request, res: Response) => {
        const result = await this.catalogService.getCollection(req.params.slug!);
        res.json({ success: true, data: result });
    });

    adminListCollections = catchAsync(async (_req: Request, res: Response) => {
        const result = await this.catalogService.adminListCollections();
        res.json({ success: true, data: result });
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
        const { productIds } = req.body;
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
}
