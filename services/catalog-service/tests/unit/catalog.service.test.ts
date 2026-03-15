import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogService } from '../../src/services/catalog.service';
import { Redis } from 'ioredis';

const mockProductRepo = {
    findAll: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    softDelete: vi.fn()
} as any;

const mockVariantRepo = {
    findByProductId: vi.fn().mockResolvedValue([])
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

describe('CatalogService', () => {
    let service: CatalogService;

    beforeEach(() => {
        service = new CatalogService(
            mockProductRepo,
            mockVariantRepo,
            {} as any,
            {} as any,
            {} as any,
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
});
