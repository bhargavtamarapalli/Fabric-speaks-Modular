import { CatalogService } from '../../src/services/catalog.service';

describe('CatalogService Unit Tests', () => {
    let service: CatalogService;
    let mockProductRepo: jest.Mocked<any>;
    let mockVariantRepo: jest.Mocked<any>;
    let mockAuditLogRepo: jest.Mocked<any>;

    beforeEach(() => {
        mockProductRepo = {
            withTransaction: jest.fn().mockImplementation(async (cb) => {
                return cb('fake_client');
            })
        };
        mockVariantRepo = {
            bulkAdjustPrices: jest.fn().mockResolvedValue(5)
        };
        mockAuditLogRepo = {
            insert: jest.fn().mockResolvedValue(undefined)
        };

        service = new CatalogService(
            mockProductRepo as any,
            mockVariantRepo as any,
            {} as any, // brandRepo
            {} as any, // categoryRepo
            {} as any, // collectionRepo
            {} as any, // variantTemplateRepo
            mockAuditLogRepo as any,
            { del: jest.fn(), pipeline: jest.fn(), scanStream: jest.fn() } as any // redis
        );
        (service as any).clearCatalogCache = jest.fn();
    });

    it('should successfully update prices and audit without dryRun', async () => {
        const res = await service.bulkUpdatePrices({
            targetType: 'global',
            targetIds: [],
            adjustmentType: 'PERCENT',
            adjustmentValue: 10,
            applyTo: 'base_price'
        }, 'admin-123');

        expect(res.updatedCount).toBe(5);
        expect(mockVariantRepo.bulkAdjustPrices).toHaveBeenCalled();
        expect(mockAuditLogRepo.insert).toHaveBeenCalled();
    });

    it('should force a transaction rollback when dryRun is true', async () => {
        const res = await service.bulkUpdatePrices({
            targetType: 'global',
            targetIds: [],
            adjustmentType: 'PERCENT',
            adjustmentValue: 10,
            applyTo: 'base_price',
            dryRun: true
        }, 'admin-123');

        expect(res.updatedCount).toBe(5);
        expect(res.dryRun).toBe(true);
        expect(mockVariantRepo.bulkAdjustPrices).toHaveBeenCalledWith(expect.anything(), 'fake_client');
        // Audit log should NOT be inserted due to rollback throw
        expect(mockAuditLogRepo.insert).not.toHaveBeenCalled();
    });
});
