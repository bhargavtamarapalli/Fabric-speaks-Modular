import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalog.service';
import { BulkUploadService } from '../services/bulk-upload.service';
import { ProductQuerySchema, CreateProductSchema, UpdateProductSchema } from '../schemas/catalog.schemas';
import { AppError, ErrorCode } from '@fs/shared/errors';

export class CatalogController {
    constructor(
        private readonly catalogService: CatalogService,
        private readonly bulkUploadService: BulkUploadService
    ) {}

    listProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = ProductQuerySchema.parse(req.query);
            const result = await this.catalogService.listProducts(query);
            res.json({ success: true, data: result.items, meta: { total: result.total, page: query.page, limit: query.limit } });
        } catch (err) {
            next(err);
        }
    };

    getProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.catalogService.getProductBySlug(req.params.slug!);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    listBrands = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.catalogService.listBrands();
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    listCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.catalogService.listCategories();
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    getCollection = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.catalogService.getCollection(req.params.slug!);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    createProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = CreateProductSchema.parse(req.body);
            const result = await this.catalogService.createProduct(dto, req.user!.userId);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    updateProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = UpdateProductSchema.parse(req.body);
            const result = await this.catalogService.updateProduct(req.params.id!, dto, req.user!.userId);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.catalogService.deleteProduct(req.params.id!, req.user!.userId);
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    };

    bulkUpload = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { csvData } = req.body; // or use multer for file upload
            if (!csvData) throw new AppError(ErrorCode.VALIDATION_ERROR, 'csvData is required');
            const result = await this.bulkUploadService.queueUpload(csvData, req.user!.userId);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    getBulkTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const template = this.bulkUploadService.getTemplateCsv();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=catalog_template.csv');
            res.send(template);
        } catch (err) {
            next(err);
        }
    };

    createBrand = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.catalogService.createBrand(req.body, req.user!.userId);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    createCollection = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.catalogService.createCollection(req.body, req.user!.userId);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };
}
