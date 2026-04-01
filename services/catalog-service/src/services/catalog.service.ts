import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { getEffectivePrice } from '@fs/shared/pricing';
import { 
    Product, 
    Variant, 
    Brand, 
    Category, 
    Collection,
    EnhancedProduct,
    IProductRepository,
    IVariantRepository,
    IBrandRepository,
    ICategoryRepository,
    ICollectionRepository,
    ProductQueryDto,
    CreateProductDto,
    UpdateProductDto,
    CreateVariantDto,
    BulkVariantUpdateDto,
    UpdateVariantDto,
} from '@fs/shared';
import { logger } from '@fs/shared/logger';
import { CreateBrandDto, CreateCollectionDto, AdminProductQueryDto, CreateCategoryDto, UpdateCategoryDto, UpdateCollectionDto, CreateVariantInputDto, UpdateVariantInputDto, UpdateBrandDto } from '../schemas/catalog.schemas';
import { VariantTemplateRepository, VariantTemplate } from '../repositories/variant_template.repository';
import { CreateVariantTemplateDto } from '../schemas/catalog.schemas';
import { AuditLogRepository } from '../repositories/audit_log.repository';

export class CatalogService {
    constructor(
        private readonly productRepo: IProductRepository,
        private readonly variantRepo: IVariantRepository,
        private readonly brandRepo: IBrandRepository,
        private readonly categoryRepo: ICategoryRepository,
        private readonly collectionRepo: ICollectionRepository,
        private readonly variantTemplateRepo: VariantTemplateRepository,
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
        const { variants, ...productPayload } = dto;
        const product = await this.productRepo.withTransaction(async (client: any) => {
            const createdProduct = await this.productRepo.create(productPayload, client);
            await this.variantRepo.bulkCreate(createdProduct.id, variants, client);
            return createdProduct;
        });
        
        await this.auditLogRepo.insert({
            adminId,
            action: 'product.create',
            entityType: 'product',
            entityId: product.id,
            afterJson: { ...product, variantCount: variants.length }
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

    async duplicateProduct(id: string, adminId: string): Promise<Product> {
        const original = await this.productRepo.findById(id);
        if (!original) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const variants = await this.variantRepo.findByProductId(id);

        const suffix = ` (Copy ${Math.floor(Date.now() / 1000).toString().slice(-4)})`;
        const newName = original.name.length + suffix.length > 200 
            ? original.name.slice(0, 200 - suffix.length) + suffix
            : original.name + suffix;
        
        const newSlug = `${original.slug}-copy-${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

        // Use repo.create which handles attributes JSONB mapping
        const copyDto: CreateProductDto = {
            name: newName,
            slug: newSlug,
            brandId: original.brandId,
            categoryId: original.categoryId,
            description: original.description,
            // Extract USP fields from raw product for CreateProductDto
            ...this.extractFabricFields(original),
            variants: variants.map(v => ({
                sku: `${v.sku}-COPY-${Math.floor(Date.now() / 1000).toString().slice(-4)}`,
                size: v.size,
                colour: v.colour,
                sizeLabel: v.sizeLabel,
                basePrice: v.basePrice,
                priceOverride: v.priceOverride,
                salePrice: v.salePrice,
                saleActive: v.saleActive,
                qty: 0,
                badges: v.badges,
                images: v.images ?? [],
                isActive: v.isActive
            }))
        } as CreateProductDto;
        const product = await this.createProduct(copyDto, adminId);

        await this.auditLogRepo.insert({
            adminId,
            action: 'product.duplicate',
            entityType: 'product',
            entityId: product.id,
            afterJson: { originalId: id, newProduct: product }
        });

        await this.clearCatalogCache();
        return product;
    }

    async bulkUpdateVariants(productId: string, updates: BulkVariantUpdateDto[], adminId: string): Promise<Variant[]> {
        const product = await this.productRepo.findById(productId);
        if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const variantIds = updates.map(update => update.variantId);
        const existingVariants = await this.variantRepo.findByProductId(productId);
        const existingById = new Map(existingVariants.map(variant => [variant.id, variant]));

        const allBelongToProduct = await this.variantRepo.verifyBelongToProduct(variantIds, productId);
        if (!allBelongToProduct) {
            throw new AppError(ErrorCode.VARIANT_NOT_FOUND, 'One or more variants do not belong to this product');
        }

        const updated = await this.variantRepo.withTransaction(async (client: any) => {
            return this.variantRepo.bulkUpdate(updates, client);
        });

        await this.auditLogRepo.insert({
            adminId,
            action: 'product.variants.bulk_update',
            entityType: 'product',
            entityId: productId,
            beforeJson: updates.map(update => {
                const before = existingById.get(update.variantId);
                return before ? { variantId: before.id, qty: before.qty, basePrice: before.basePrice, colour: before.colour } : null;
            }).filter(Boolean),
            afterJson: updated.map((variant: Variant) => ({
                variantId: variant.id,
                qty: variant.qty,
                basePrice: variant.basePrice,
                colour: variant.colour
            }))
        });

        await this.clearCatalogCache();
        await this.redis.del(`catalog:product:${product.slug}`);
        return updated;
    }

    async bulkUpdatePrices(dto: { targetType: 'product' | 'variant' | 'collection' | 'brand' | 'global'; targetIds: string[]; adjustmentType: 'PERCENT' | 'FIXED'; adjustmentValue: number; applyTo: 'base_price' | 'price_override' }, adminId: string) {
        const updatedCount = await this.variantRepo.bulkAdjustPrices({
            targetType: dto.targetType,
            targetIds: dto.targetIds,
            adjustmentType: dto.adjustmentType,
            adjustmentValue: dto.adjustmentValue,
            applyTo: dto.applyTo
        });

        await this.auditLogRepo.insert({
            adminId,
            action: 'pricing.bulk_update',
            entityType: 'pricing',
            entityId: '00000000-0000-0000-0000-000000000100',
            afterJson: {
                targetType: dto.targetType,
                targetIds: dto.targetIds,
                adjustmentType: dto.adjustmentType,
                adjustmentValue: dto.adjustmentValue,
                applyTo: dto.applyTo,
                updatedCount
            }
        });

        await this.clearCatalogCache();
        return { updatedCount };
    }

    async createVariant(productId: string, dto: CreateVariantInputDto, adminId: string): Promise<Variant> {
        const product = await this.productRepo.findById(productId);
        if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const sku = await this.generateVariantSku(product.slug, dto.size, dto.colour);
        const variantDto: CreateVariantDto = {
            sku,
            size: dto.size,
            colour: dto.colour,
            sizeLabel: dto.sizeLabel,
            basePrice: dto.basePrice,
            priceOverride: dto.priceOverride,
            salePrice: dto.salePrice,
            saleActive: dto.saleActive,
            qty: 0,
            images: dto.images ?? [],
            isActive: true
        };

        const variant = await this.variantRepo.create({ ...variantDto, productId });

        await this.auditLogRepo.insert({
            adminId,
            action: 'variant.create',
            entityType: 'variant',
            entityId: variant.id,
            afterJson: {
                productId,
                sku: variant.sku,
                size: variant.size,
                colour: variant.colour,
                basePrice: variant.basePrice
            }
        });

        await this.clearCatalogCache();
        await this.redis.del(`catalog:product:${product.slug}`);
        return this.withComputedVariantFields(variant) as any;
    }

    async updateVariant(variantId: string, dto: UpdateVariantInputDto, adminId: string): Promise<Variant> {
        const before = await this.variantRepo.findById(variantId);
        if (!before) throw new AppError(ErrorCode.VARIANT_NOT_FOUND);

        const product = await this.productRepo.findById(before.productId);
        if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const updated = await this.variantRepo.updateById(variantId, {
            sizeLabel: dto.sizeLabel,
            basePrice: dto.basePrice,
            priceOverride: dto.priceOverride,
            salePrice: dto.salePrice,
            saleActive: dto.saleActive,
            qty: undefined,
            badges: undefined,
            images: dto.images,
            isActive: undefined
        } as UpdateVariantDto);

        await this.auditLogRepo.insert({
            adminId,
            action: 'variant.update',
            entityType: 'variant',
            entityId: variantId,
            beforeJson: {
                sizeLabel: before.sizeLabel,
                basePrice: before.basePrice,
                priceOverride: before.priceOverride,
                salePrice: before.salePrice,
                saleActive: before.saleActive
            },
            afterJson: {
                sizeLabel: updated.sizeLabel,
                basePrice: updated.basePrice,
                priceOverride: updated.priceOverride,
                salePrice: updated.salePrice,
                saleActive: updated.saleActive
            }
        });

        await this.clearCatalogCache();
        await this.redis.del(`catalog:product:${product.slug}`);
        return this.withComputedVariantFields(updated) as any;
    }

    async deactivateVariant(variantId: string, adminId: string): Promise<{ variantId: string; deactivated: true; wishlistNotificationsSent: number }> {
        const before = await this.variantRepo.findById(variantId);
        if (!before) throw new AppError(ErrorCode.VARIANT_NOT_FOUND);

        const activeOrders = await (this.variantRepo as any).countActiveOrders(variantId);
        if (activeOrders > 0) {
            throw new AppError(ErrorCode.PRODUCT_HAS_PENDING_ORDERS, 'Variant has pending orders');
        }

        const product = await this.productRepo.findById(before.productId);
        if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

        const deactivated = await this.variantRepo.deactivate(variantId);
        const subscriptions = await (this.variantRepo as any).countActiveNotifySubscriptions(variantId);

        await this.auditLogRepo.insert({
            adminId,
            action: 'variant.deactivate',
            entityType: 'variant',
            entityId: variantId,
            beforeJson: { isActive: before.isActive },
            afterJson: { isActive: deactivated.isActive, wishlistNotificationsSent: subscriptions }
        });

        await this.clearCatalogCache();
        await this.redis.del(`catalog:product:${product.slug}`);

        return {
            variantId,
            deactivated: true,
            wishlistNotificationsSent: subscriptions
        };
    }

    private extractFabricFields(product: Product): any {
        const attrs = (product as any).attributes || {};
        return {
            fabricType: attrs.fabric_type,
            gsmWeight: attrs.gsm_weight,
            weaveType: attrs.weave_type,
            breathabilityRating: attrs.breathability_rating,
            careInstructions: attrs.care_instructions,
            fabricOrigin: attrs.fabric_origin
        };
    }

    async listBrands(): Promise<{ items: Brand[]; total: number }> {
        const items = await this.brandRepo.findAllActive();
        return { items, total: items.length };
    }

    async adminListBrands(): Promise<{ items: Brand[]; total: number }> {
        const items = await this.brandRepo.findAll(true);
        return { items, total: items.length };
    }

    async listCategories(): Promise<{ items: Category[]; total: number }> {
        const items = await this.categoryRepo.findAllActive();
        return { items, total: items.length };
    }

    async adminListCategories(): Promise<{ items: Category[]; total: number }> {
        const items = await this.categoryRepo.findAll(true);
        return { items, total: items.length };
    }

    async adminListCollections(): Promise<{ items: Collection[]; total: number }> {
        const items = await this.collectionRepo.findAll(true);
        return { items, total: items.length };
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

    async updateBrand(id: string, dto: UpdateBrandDto, adminId: string): Promise<Brand> {
        const before = await this.brandRepo.findById(id);
        if (!before) throw new AppError(ErrorCode.NOT_FOUND, 'Brand not found');

        const brand = await this.brandRepo.update(id, dto);
        await this.auditLogRepo.insert({
            adminId,
            action: dto.isActive === false ? 'brand.deactivate' : 'brand.update',
            entityType: 'brand',
            entityId: id,
            beforeJson: before,
            afterJson: brand
        });
        return brand;
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

    async reorderCollectionProducts(id: string, productIds: string[], adminId: string): Promise<void> {
        const collection = await this.collectionRepo.findById(id);
        if (!collection) throw new AppError(ErrorCode.NOT_FOUND, 'Collection not found');

        try {
            await this.collectionRepo.reorderProducts(id, productIds);
        } catch (error) {
            logger.warn({ collectionId: id, productIds, error }, 'Invalid collection reorder payload');
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'Reorder payload must match the products already assigned to the collection');
        }

        await this.auditLogRepo.insert({
            adminId,
            action: 'collection.reorder_products',
            entityType: 'collection',
            entityId: id,
            afterJson: { productIds }
        });
    }

    async listVariantTemplates(): Promise<{ items: VariantTemplate[]; total: number }> {
        const cacheKey = 'catalog:variant_templates';
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const items = await this.variantTemplateRepo.findAll();
        const result = { items, total: items.length };
        await this.redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour TTL
        return result;
    }

    async createVariantTemplate(dto: CreateVariantTemplateDto, adminId: string): Promise<VariantTemplate> {
        const existing = await this.variantTemplateRepo.findByName(dto.name);
        if (existing) throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'Template name already exists');

        const template = await this.variantTemplateRepo.create(dto.name, dto.sizes, dto.colours);

        await this.auditLogRepo.insert({
            adminId,
            action: 'variant_template.create',
            entityType: 'variant_template',
            entityId: template.id,
            afterJson: template
        });

        await this.redis.del('catalog:variant_templates');
        return template;
    }

    async updateVariantTemplate(id: string, dto: { sizes?: string[], colours?: string[] }, adminId: string): Promise<VariantTemplate> {
        const before = await this.variantTemplateRepo.findAll().then(items => items.find(i => i.id === id));
        if (!before) throw new AppError(ErrorCode.NOT_FOUND, 'Template not found');

        const template = await this.variantTemplateRepo.update(
            id, 
            dto.sizes ?? before.sizes, 
            dto.colours ?? before.colours
        );

        await this.auditLogRepo.insert({
            adminId,
            action: 'variant_template.update',
            entityType: 'variant_template',
            entityId: id,
            beforeJson: before,
            afterJson: template
        });

        await this.redis.del('catalog:variant_templates');
        return template;
    }

    async deleteVariantTemplate(id: string, adminId: string): Promise<void> {
        await this.variantTemplateRepo.delete(id);
        
        await this.auditLogRepo.insert({
            adminId,
            action: 'variant_template.delete',
            entityType: 'variant_template',
            entityId: id
        });

        await this.redis.del('catalog:variant_templates');
    }

    async cleanupMeterSizes(adminId: string): Promise<{ templatesUpdated: number, templatesDeleted: number, variantsDeleted: number }> {
        const meterSizes = ['0.5m', '1m', '1.5m', '2m', '2.5m', '3m', '5m', '10m'];
        
        // 1. Templates cleanup
        const templates = await this.variantTemplateRepo.findAll();
        let templatesUpdated = 0;
        let templatesDeleted = 0;

        for (const template of templates) {
            const filteredSizes = template.sizes.filter(s => !meterSizes.includes(s));
            if (filteredSizes.length === 0) {
                await this.variantTemplateRepo.delete(template.id);
                templatesDeleted++;
            } else if (filteredSizes.length !== template.sizes.length) {
                await this.variantTemplateRepo.update(template.id, filteredSizes, template.colours);
                templatesUpdated++;
            }
        }

        // 2. Variants cleanup
        const variantsDeleted = await this.variantRepo.deleteBySizes(meterSizes);

        // 3. Clear cache
        await this.redis.del('catalog:variant_templates');
        await this.clearCatalogCache();

        await this.auditLogRepo.insert({
            adminId,
            action: 'catalog.cleanup_meter_sizes',
            afterJson: { templatesUpdated, templatesDeleted, variantsDeleted }
        });

        return { templatesUpdated, templatesDeleted, variantsDeleted };
    }

    async getCollection(slug: string): Promise<any> {
        const collection = await this.collectionRepo.findBySlug(slug);
        if (!collection) throw new AppError(ErrorCode.NOT_FOUND);
        
        const productIds = await this.collectionRepo.findProductsByCollectionId(collection.id);
        // This is simplified; real logic might need to fetch full product details
        return { ...collection, productIds };
    }

    private async clearCatalogCache(): Promise<void> {
        return new Promise((resolve, reject) => {
            const stream = this.redis.scanStream({
                match: 'catalog:list:*',
                count: 100
            });
            stream.on('data', async (keys: string[]) => {
                if (keys.length > 0) {
                    stream.pause();
                    const pipeline = this.redis.pipeline();
                    keys.forEach(key => pipeline.del(key));
                    await pipeline.exec();
                    stream.resume();
                }
            });
            stream.on('end', () => resolve());
            stream.on('error', reject);
        });
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

    private withComputedVariantFields(variant: Variant) {
        return {
            ...variant,
            effectivePrice: getEffectivePrice({
                base_price: variant.basePrice,
                sale_price: variant.salePrice,
                price_override: variant.priceOverride,
                sale_active: variant.saleActive
            }),
            isOnSale: Boolean(variant.saleActive && variant.salePrice)
        };
    }

    private async generateVariantSku(productSlug: string, size: string, colour: string): Promise<string> {
        const slugPrefix = productSlug.replace(/[^a-z0-9]/g, '').toUpperCase().slice(0, 4) || 'PROD';
        const sizeCode = size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
        const colourCode = colour.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3);

        let candidate = `FS-${slugPrefix}-${sizeCode}-${colourCode}`;
        let counter = 1;
        const MAX_ATTEMPTS = 10;
        
        while (await this.variantRepo.findBySku(candidate)) {
            if (counter >= MAX_ATTEMPTS) {
                throw new AppError(ErrorCode.VALIDATION_ERROR, `Failed to generate a unique SKU after ${MAX_ATTEMPTS} attempts`);
            }
            candidate = `FS-${slugPrefix}-${sizeCode}-${colourCode}-${counter}`;
            counter += 1;
        }

        return candidate;
    }
}
