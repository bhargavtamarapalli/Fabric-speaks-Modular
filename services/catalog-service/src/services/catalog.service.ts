import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { getEffectivePrice } from '@fs/shared/pricing';
import { 
    Product, 
    Variant, 
    Brand, 
    Category, 
    EnhancedProduct,
    IProductRepository,
    IVariantRepository,
    IBrandRepository,
    ICategoryRepository,
    ICollectionRepository,
    ProductQueryDto,
    CreateProductDto,
    UpdateProductDto,
} from '@fs/shared';
import { CreateBrandDto, CreateCollectionDto, AdminProductQueryDto, CreateCategoryDto, UpdateCategoryDto, UpdateCollectionDto, DeactivateProductSchema } from '../schemas/catalog.schemas';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { logger } from '@fs/shared/logger';

export class CatalogService {
    constructor(
        private readonly productRepo: IProductRepository,
        private readonly variantRepo: IVariantRepository,
        private readonly brandRepo: IBrandRepository,
        private readonly categoryRepo: ICategoryRepository,
        private readonly collectionRepo: ICollectionRepository,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly redis: Redis
    ) {}

    async listProducts(filters: ProductQueryDto): Promise<{ items: EnhancedProduct[]; total: number }> {
        const cacheKey = `catalog:list:${JSON.stringify(filters)}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const { items: products, total } = await this.productRepo.findAll(filters);
        
        // Enhance products with variants data and flatten fabric fields
        const enhancedItems: EnhancedProduct[] = await Promise.all(products.map(async (p: Product) => {
            const variants = await this.variantRepo.findByProductId(p.id);
            const flatProduct = this.flattenFabricFields(p);
            return {
                ...flatProduct,
                variants: variants.map((v: Variant) => ({
                    ...v,
                    effectivePrice: getEffectivePrice({
                        base_price: v.basePrice,
                        sale_price: v.salePrice,
                        price_override: v.priceOverride,
                        sale_active: v.saleActive
                    })
                }))
            } as EnhancedProduct;
        }));

        const result = { items: enhancedItems, total };
        await this.redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min TTL
        return result;
    }

    async adminListProducts(filters: AdminProductQueryDto): Promise<{ items: EnhancedProduct[]; total: number }> {
        // Admin list bypasses cache and allows filtering by active status
        const { items: products, total } = await this.productRepo.findAllAdmin?.(filters) || await this.productRepo.findAll({
            page: filters.page,
            limit: filters.limit,
            // mapping admin filters to standard query if no findAllAdmin available
            search: '',
        });
        
        const enhancedItems: EnhancedProduct[] = await Promise.all(products.map(async (p: Product) => {
            const variants = await this.variantRepo.findByProductId(p.id);
            const flatProduct = this.flattenFabricFields(p);
            return {
                ...flatProduct,
                variants: variants.map((v: Variant) => ({
                    ...v,
                    effectivePrice: getEffectivePrice({
                        base_price: v.basePrice,
                        sale_price: v.salePrice,
                        price_override: v.priceOverride,
                        sale_active: v.saleActive
                    })
                }))
            } as EnhancedProduct;
        }));

        return { items: enhancedItems, total };
    }

    async getProductBySlug(slug: string): Promise<EnhancedProduct> {
        const cacheKey = `catalog:product:${slug}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const product = await this.productRepo.findBySlug(slug);
        if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const variants = await this.variantRepo.findByProductId(product.id);
        const flatProduct = this.flattenFabricFields(product);
        const result: EnhancedProduct = {
            ...flatProduct,
            variants: variants.map(v => ({
                ...v,
                effectivePrice: getEffectivePrice({
                    base_price: v.basePrice,
                    sale_price: v.salePrice,
                    price_override: v.priceOverride,
                    sale_active: v.saleActive
                })
            }))
        } as EnhancedProduct;

        await this.redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min TTL
        return result;
    }

    async createProduct(dto: CreateProductDto, adminId: string): Promise<Product> {
        const product = await this.productRepo.create(dto);
        
        await this.auditLogRepo.insert({
            adminId,
            action: 'product.create',
            entityType: 'product',
            entityId: product.id,
            afterJson: product
        });

        await this.clearCatalogCache();
        return product;
    }

    async updateProduct(id: string, dto: UpdateProductDto, adminId: string): Promise<Product> {
        const before = await this.productRepo.findById(id);
        if (!before) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const product = await this.productRepo.update(id, dto);

        await this.auditLogRepo.insert({
            adminId,
            action: 'product.update',
            entityType: 'product',
            entityId: id,
            beforeJson: before,
            afterJson: product
        });

        await this.clearCatalogCache();
        await this.redis.del(`catalog:product:${product.slug}`);
        return product;
    }

    async deactivateProduct(id: string, dto: { confirm: boolean }, adminId: string): Promise<Product> {
        if (!dto.confirm) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Confirmation required to deactivate product');
        
        const before = await this.productRepo.findById(id);
        if (!before) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const product = await this.productRepo.update(id, { isActive: false });

        await this.auditLogRepo.insert({
            adminId,
            action: 'product.deactivate',
            entityType: 'product',
            entityId: id,
            beforeJson: before,
            afterJson: product
        });

        await this.clearCatalogCache();
        await this.redis.del(`catalog:product:${product.slug}`);
        return product;
    }

    async deleteProduct(id: string, adminId: string): Promise<void> {
        const before = await this.productRepo.findById(id);
        if (!before) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        await this.productRepo.softDelete(id);

        await this.auditLogRepo.insert({
            adminId,
            action: 'product.delete',
            entityType: 'product',
            entityId: id,
            beforeJson: before
        });

        await this.clearCatalogCache();
        await this.redis.del(`catalog:product:${before.slug}`);
    }

    async listBrands(): Promise<Brand[]> {
        return this.brandRepo.findAllActive();
    }

    async listCategories(): Promise<Category[]> {
        return this.categoryRepo.findAllActive();
    }

    async createCategory(dto: CreateCategoryDto, adminId: string): Promise<Category> {
        const category = await (this.categoryRepo as any).create(dto);
        await this.auditLogRepo.insert({
            adminId,
            action: 'category.create',
            entityType: 'category',
            entityId: category.id,
            afterJson: category
        });
        return category;
    }

    async updateCategory(id: string, dto: UpdateCategoryDto, adminId: string): Promise<Category> {
        // Fallback or explicit method
        const category = await (this.categoryRepo as any).update(id, dto);
        await this.auditLogRepo.insert({
            adminId,
            action: 'category.update',
            entityType: 'category',
            entityId: id,
            afterJson: category
        });
        return category;
    }

    async createBrand(dto: CreateBrandDto, adminId: string): Promise<Brand> {
        const brand = await this.brandRepo.create(dto);
        await this.auditLogRepo.insert({
            adminId,
            action: 'brand.create',
            entityType: 'brand',
            entityId: brand.id,
            afterJson: brand
        });
        return brand;
    }

    async createCollection(dto: CreateCollectionDto, adminId: string): Promise<any> {
        const collection = await this.collectionRepo.create(dto);
        
        await this.auditLogRepo.insert({
            adminId,
            action: 'collection.create',
            entityType: 'collection',
            entityId: collection.id,
            afterJson: collection
        });

        return collection;
    }

    async updateCollection(id: string, dto: UpdateCollectionDto, adminId: string): Promise<any> {
        const collection = await this.collectionRepo.update(id, dto);
        
        await this.auditLogRepo.insert({
            adminId,
            action: 'collection.update',
            entityType: 'collection',
            entityId: id,
            afterJson: collection
        });

        return collection;
    }

    async addCollectionProducts(id: string, productIds: string[], adminId: string): Promise<void> {
        await this.collectionRepo.addProducts(id, productIds);
        await this.auditLogRepo.insert({
            adminId,
            action: 'collection.add_products',
            entityType: 'collection',
            entityId: id,
            afterJson: { addedProductIds: productIds }
        });
    }

    async removeCollectionProduct(id: string, productId: string, adminId: string): Promise<void> {
        await this.collectionRepo.removeProduct(id, productId);
        await this.auditLogRepo.insert({
            adminId,
            action: 'collection.remove_product',
            entityType: 'collection',
            entityId: id,
            afterJson: { removedProductId: productId }
        });
    }

    async getCollection(slug: string): Promise<any> {
        const collection = await this.collectionRepo.findBySlug(slug);
        if (!collection) throw new AppError(ErrorCode.NOT_FOUND);
        
        const productIds = await this.collectionRepo.findProductsByCollectionId(collection.id);
        // This is simplified; real logic might need to fetch full product details
        return { ...collection, productIds };
    }

    private async clearCatalogCache(): Promise<void> {
        const keys = await this.redis.keys('catalog:list:*');
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }

    private flattenFabricFields(product: Product): any {
        const attrs = (product as any).attributes || {};
        return {
            ...product,
            fabricType: attrs.fabric_type,
            gsmWeight: attrs.gsm_weight,
            weaveType: attrs.weave_type,
            breathabilityRating: attrs.breathability_rating,
            careInstructions: attrs.care_instructions,
            fabricOrigin: attrs.fabric_origin
        };
    }
}
