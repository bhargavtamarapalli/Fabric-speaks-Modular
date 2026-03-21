import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogService } from '../../src/services/catalog.service';
import { Redis } from 'ioredis';

const mockProductRepo = {
    findAll: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    softDelete: vi.fn(),
    withTransaction: vi.fn(async (fn: any) => fn({ query: vi.fn() }))
} as any;

const mockVariantRepo = {
    findById: vi.fn(),
    findByProductId: vi.fn().mockResolvedValue([]),
    findBySku: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    bulkCreate: vi.fn().mockResolvedValue([]),
    verifyBelongToProduct: vi.fn().mockResolvedValue(true),
    bulkUpdate: vi.fn().mockResolvedValue([]),
    updateById: vi.fn(),
    deactivate: vi.fn(),
    countActiveOrders: vi.fn().mockResolvedValue(0),
    countActiveNotifySubscriptions: vi.fn().mockResolvedValue(0),
    withTransaction: vi.fn(async (fn: any) => fn({ query: vi.fn() }))
} as any;

const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([])
} as unknown as Redis;

const mockAuditLogRepo = {
    insert: vi.fn().mockResolvedValue(undefined)
} as any;

const mockBrandRepo = {
    findAllActive: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
} as any;

const mockCategoryRepo = {
    findAllActive: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn()
} as any;

const mockCollectionRepo = {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    reorderProducts: vi.fn().mockResolvedValue(undefined)
} as any;

describe('CatalogService', () => {
    let service: CatalogService;

    beforeEach(() => {
        service = new CatalogService(
            mockProductRepo,
            mockVariantRepo,
            mockBrandRepo,
            mockCategoryRepo,
            mockCollectionRepo,
            mockAuditLogRepo,
            mockRedis
        );
        vi.clearAllMocks();
    });

    it('should flatten fabric fields from attributes JSONB', async () => {
        const product = {
            id: 'p1',
            name: 'Shirt',
            slug: 'shirt',
            attributes: {
                fabric_type: 'Cotton',
                gsm_weight: 180,
                weave_type: 'Plain',
                breathability_rating: 'High',
                care_instructions: 'Wash cold',
                fabric_origin: 'India'
            }
        };
        mockProductRepo.findBySlug.mockResolvedValue(product);

        const result = await service.getProductBySlug('shirt');

        expect(result.fabricType).toBe('Cotton');
        expect(result.gsmWeight).toBe(180);
        expect(result.weaveType).toBe('Plain');
        expect(result.breathabilityRating).toBe('High');
        expect(result.careInstructions).toBe('Wash cold');
        expect(result.fabricOrigin).toBe('India');
    });

    it('should create product and variants in a single transaction', async () => {
        mockProductRepo.create.mockResolvedValue({
            id: 'product-1',
            slug: 'shirt',
            name: 'Shirt'
        });

        await service.createProduct({
            name: 'Shirt',
            slug: 'shirt',
            brandId: 'brand-1',
            categoryId: 'cat-1',
            fabricType: 'Cotton',
            gsmWeight: 180,
            weaveType: 'Plain',
            breathabilityRating: 'High',
            careInstructions: 'Wash cold',
            fabricOrigin: 'India',
            variants: [
                { sku: 'SKU-1', basePrice: 999, qty: 5 }
            ]
        } as any, 'admin-1');

        expect(mockProductRepo.withTransaction).toHaveBeenCalledTimes(1);
        expect(mockVariantRepo.bulkCreate).toHaveBeenCalledWith(
            'product-1',
            [{ sku: 'SKU-1', basePrice: 999, qty: 5 }],
            expect.anything()
        );
    });

    it('should bulk update variants for a product after ownership verification', async () => {
        mockProductRepo.findById.mockResolvedValue({ id: 'product-1', slug: 'shirt' });
        mockVariantRepo.findByProductId.mockResolvedValue([{ id: 'variant-1', qty: 5, basePrice: 999, colour: 'Blue' }]);
        mockVariantRepo.bulkUpdate.mockResolvedValue([{ id: 'variant-1', qty: 8, basePrice: 1099, colour: 'Blue' }]);

        const result = await service.bulkUpdateVariants('product-1', [
            { variantId: 'variant-1', qty: 8, basePrice: 1099 }
        ] as any, 'admin-1');

        expect(mockVariantRepo.verifyBelongToProduct).toHaveBeenCalledWith(['variant-1'], 'product-1');
        expect(mockVariantRepo.bulkUpdate).toHaveBeenCalledWith(
            [{ variantId: 'variant-1', qty: 8, basePrice: 1099 }],
            expect.anything()
        );
        expect(result[0]?.qty).toBe(8);
    });

    it('should create a variant with generated SKU', async () => {
        mockProductRepo.findById.mockResolvedValue({ id: 'product-1', slug: 'linen-shirt' });
        mockVariantRepo.create.mockResolvedValue({ id: 'variant-1', sku: 'FS-LINE-M-NAV', basePrice: 1200 });

        const result = await service.createVariant('product-1', {
            size: 'M',
            colour: 'Navy',
            sizeLabel: 'M (38-40)',
            basePrice: 1200,
            saleActive: false
        } as any, 'admin-1');

        expect(mockVariantRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            productId: 'product-1',
            sku: 'FS-LINE-M-NAV',
            qty: 0
        }));
        expect(result.id).toBe('variant-1');
    });

    it('should update a variant by id', async () => {
        mockVariantRepo.findById.mockResolvedValue({ id: 'variant-1', productId: 'product-1', sizeLabel: 'M', basePrice: 1000, saleActive: false });
        mockProductRepo.findById.mockResolvedValue({ id: 'product-1', slug: 'linen-shirt' });
        mockVariantRepo.updateById.mockResolvedValue({ id: 'variant-1', productId: 'product-1', sizeLabel: 'M updated', basePrice: 1100, saleActive: false });

        const result = await service.updateVariant('variant-1', {
            sizeLabel: 'M updated',
            basePrice: 1100
        } as any, 'admin-1');

        expect(mockVariantRepo.updateById).toHaveBeenCalledWith('variant-1', expect.objectContaining({
            sizeLabel: 'M updated',
            basePrice: 1100
        }));
        expect(result.basePrice).toBe(1100);
    });

    it('should deactivate a variant when there are no pending orders', async () => {
        mockVariantRepo.findById.mockResolvedValue({ id: 'variant-1', productId: 'product-1', isActive: true });
        mockProductRepo.findById.mockResolvedValue({ id: 'product-1', slug: 'linen-shirt' });
        mockVariantRepo.countActiveNotifySubscriptions.mockResolvedValue(2);
        mockVariantRepo.deactivate.mockResolvedValue({ id: 'variant-1', isActive: false });

        const result = await service.deactivateVariant('variant-1', 'admin-1');

        expect(mockVariantRepo.deactivate).toHaveBeenCalledWith('variant-1');
        expect(result).toEqual({
            variantId: 'variant-1',
            deactivated: true,
            wishlistNotificationsSent: 2
        });
    });

    it('should update a brand and emit an audit log entry', async () => {
        mockBrandRepo.findById.mockResolvedValue({ id: 'brand-1', name: 'Old Brand', isActive: true });
        mockBrandRepo.update.mockResolvedValue({ id: 'brand-1', name: 'New Brand', isActive: true });

        const result = await service.updateBrand('brand-1', { name: 'New Brand' }, 'admin-1');

        expect(mockBrandRepo.update).toHaveBeenCalledWith('brand-1', { name: 'New Brand' });
        expect(mockAuditLogRepo.insert).toHaveBeenCalled();
        expect(result.name).toBe('New Brand');
    });

    it('should reorder products inside a collection', async () => {
        mockCollectionRepo.findById.mockResolvedValue({ id: 'collection-1', name: 'Summer' });

        await service.reorderCollectionProducts('collection-1', ['prod-1', 'prod-2'], 'admin-1');

        expect(mockCollectionRepo.reorderProducts).toHaveBeenCalledWith('collection-1', ['prod-1', 'prod-2']);
        expect(mockAuditLogRepo.insert).toHaveBeenCalled();
    });
});
