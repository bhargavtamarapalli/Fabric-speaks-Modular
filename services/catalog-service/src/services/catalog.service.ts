import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { getEffectivePrice } from '@fs/shared/pricing';
import { ProductRepository, Product } from '../repositories/product.repository';
import { VariantRepository, Variant } from '../repositories/variant.repository';
import { BrandRepository } from '../repositories/brand.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { ProductQueryDto, CreateProductDto, UpdateProductDto } from '../schemas/catalog.schemas';
import { logger } from '@fs/shared/logger';

export class CatalogService {
    constructor(
        private readonly productRepo: ProductRepository,
        private readonly variantRepo: VariantRepository,
        private readonly brandRepo: BrandRepository,
        private readonly categoryRepo: CategoryRepository,
        private readonly collectionRepo: CollectionRepository,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly redis: Redis
    ) {}

    async listProducts(filters: ProductQueryDto): Promise<{ items: any[]; total: number }> {
        const cacheKey = `catalog:list:${JSON.stringify(filters)}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const { items: products, total } = await this.productRepo.findAll(filters);
        
        // Enhance products with variants data (basic for PLP)
        const enhancedItems = await Promise.all(products.map(async (p) => {
            const variants = await this.variantRepo.findByProductId(p.id);
            return {
                ...p,
                variants: variants.map(v => ({
                    ...v,
                    effectivePrice: getEffectivePrice({
                        base_price: v.basePrice,
                        sale_price: v.salePrice,
                        price_override: v.priceOverride,
                        sale_active: v.saleActive
                    })
                }))
            };
        }));

        const result = { items: enhancedItems, total };
        await this.redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min TTL
        return result;
    }

    async getProductBySlug(slug: string): Promise<any> {
        const cacheKey = `catalog:product:${slug}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const product = await this.productRepo.findBySlug(slug);
        if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const variants = await this.variantRepo.findByProductId(product.id);
        const result = {
            ...product,
            variants: variants.map(v => ({
                ...v,
                effectivePrice: getEffectivePrice({
                    base_price: v.basePrice,
                    sale_price: v.salePrice,
                    price_override: v.priceOverride,
                    sale_active: v.saleActive
                })
            }))
        };

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

    async listBrands(): Promise<any[]> {
        return this.brandRepo.findAllActive();
    }

    async listCategories(): Promise<any[]> {
        return this.categoryRepo.findAllActive();
    }

    async createBrand(dto: { name: string, slug: string, story?: string, logoUrl?: string }, adminId: string): Promise<any> {
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

    async createCollection(dto: any, adminId: string): Promise<any> {
        // Logic to create collection would go here
        // For now, simplify or implement repository method if needed
        return { success: true };
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
}
