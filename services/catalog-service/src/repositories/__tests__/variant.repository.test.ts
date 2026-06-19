import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VariantRepository } from '../variant.repository';
import { AppError, ErrorCode } from '@fs/shared';
import { DbClient } from '@fs/shared';

// Mock dependencies
vi.mock('@fs/shared', async () => {
  const actual = await vi.importActual('@fs/shared');
  return {
    ...actual,
    getDbClient: vi.fn(),
    getRedisClient: vi.fn(),
  };
});

describe('VariantRepository - SKU Validation (Task 1.1)', () => {
  let variantRepo: VariantRepository;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
    variantRepo = new VariantRepository(mockClient);
  });

  describe('findBySkus()', () => {
    it('should retrieve existing SKUs from database', async () => {
      const skus = ['SKU001', 'SKU002', 'SKU003'];
      const mockResults = [
        { id: 'v1', sku: 'SKU001', product_id: 'p1' },
        { id: 'v2', sku: 'SKU002', product_id: 'p1' },
      ];

      mockClient.query.mockResolvedValue(mockResults);

      const result = await variantRepo.findBySkus(skus);

      expect(result).toEqual(mockResults);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "sku" = ANY($1)'),
        [skus]
      );
    });

    it('should return empty array when no SKUs match', async () => {
      const skus = ['NONEXISTENT1', 'NONEXISTENT2'];
      mockClient.query.mockResolvedValue([]);

      const result = await variantRepo.findBySkus(skus);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const skus = ['SKU001'];
      mockClient.query.mockRejectedValue(new Error('DB connection failed'));

      await expect(variantRepo.findBySkus(skus)).rejects.toThrow('DB connection failed');
    });
  });

  describe('verifySkuUniqueness()', () => {
    it('should throw DUPLICATE_SKU if batch contains duplicate SKUs', async () => {
      const skus = ['SKU001', 'SKU002', 'SKU001']; // Duplicate SKU001

      await expect(variantRepo.verifySkuUniqueness(skus)).rejects.toThrow();
      const error = await variantRepo.verifySkuUniqueness(skus).catch(e => e);
      expect(error.code).toBe(ErrorCode.DUPLICATE_SKU);
    });

    it('should throw SKU_ALREADY_EXISTS if SKU already exists in database', async () => {
      const skus = ['SKU001', 'SKU002'];
      mockClient.query.mockResolvedValue([
        { id: 'v1', sku: 'SKU001' }
      ]);

      const error = await variantRepo.verifySkuUniqueness(skus).catch(e => e);
      expect(error.code).toBe(ErrorCode.SKU_ALREADY_EXISTS);
    });

    it('should pass validation for unique SKUs not in database', async () => {
      const skus = ['SKU001', 'SKU002', 'SKU003'];
      mockClient.query.mockResolvedValue([]); // No existing SKUs

      await expect(variantRepo.verifySkuUniqueness(skus)).resolves.not.toThrow();
    });

    it('should perform batch SKU lookup before validation', async () => {
      const skus = ['SKU001', 'SKU002'];
      mockClient.query.mockResolvedValue([]);

      await variantRepo.verifySkuUniqueness(skus);

      expect(mockClient.query).toHaveBeenCalled();
      const callArgs = mockClient.query.mock.calls[0];
      expect(callArgs[0]).toContain('WHERE "sku" = ANY');
    });
  });

  describe('bulkCreate() with SKU validation', () => {
    it('should call verifySkuUniqueness before transaction', async () => {
      const verifySpy = vi.spyOn(variantRepo, 'verifySkuUniqueness');
      const transactionSpy = vi.spyOn(variantRepo, 'withTransaction').mockResolvedValue([]);

      const updates = [
        { productId: 'p1', sku: 'SKU001', qty: 10 },
        { productId: 'p1', sku: 'SKU002', qty: 20 },
      ];

      await variantRepo.bulkCreate(updates);

      expect(verifySpy).toHaveBeenCalledBefore(transactionSpy);
      expect(verifySpy).toHaveBeenCalledWith(['SKU001', 'SKU002']);
    });

    it('should prevent transaction if SKU validation fails', async () => {
      vi.spyOn(variantRepo, 'verifySkuUniqueness').mockRejectedValue(
        new AppError(ErrorCode.DUPLICATE_SKU, 'Duplicate found')
      );
      const transactionSpy = vi.spyOn(variantRepo, 'withTransaction');

      const updates = [
        { productId: 'p1', sku: 'SKU001', qty: 10 },
        { productId: 'p1', sku: 'SKU001', qty: 20 }, // Duplicate
      ];

      await expect(variantRepo.bulkCreate(updates)).rejects.toThrow();
      expect(transactionSpy).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdate() atomicity', () => {
    it('should use single JSONB unnest query for atomic update', async () => {
      const mockTransaction = vi.fn();
      mockClient.query.mockResolvedValue([
        { id: 'v1', qty: 100 },
        { id: 'v2', qty: 200 },
      ]);

      const updates = [
        { variantId: 'v1', qty: 100 },
        { variantId: 'v2', qty: 200 },
      ];

      await variantRepo.bulkUpdate(updates, mockClient);

      // Verify single query was executed
      expect(mockClient.query).toHaveBeenCalledTimes(1);

      // Verify JSONB unnest pattern in query
      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('jsonb_to_recordset');
      expect(queryCall[0]).toContain('UPDATE variants');
    });

    it('should verify all updates were applied successfully', async () => {
      const updates = [
        { variantId: 'v1', qty: 100 },
        { variantId: 'v2', qty: 200 },
        { variantId: 'v3', qty: 300 },
      ];

      // Simulate only 2 updates applied
      mockClient.query.mockResolvedValue([
        { id: 'v1', qty: 100 },
        { id: 'v2', qty: 200 },
      ]);

      const error = await variantRepo.bulkUpdate(updates, mockClient).catch(e => e);
      expect(error.code).toBe(ErrorCode.VARIANT_NOT_FOUND);
    });

    it('should rollback on constraint violation', async () => {
      mockClient.query.mockRejectedValue(
        new Error('UPDATE would violate CHECK constraint')
      );

      const updates = [{ variantId: 'v1', qty: -100 }]; // Negative quantity

      await expect(variantRepo.bulkUpdate(updates, mockClient)).rejects.toThrow();

      // Verify no partial updates occurred (transaction isolation)
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should handle empty updates array', async () => {
      const updates: any[] = [];
      mockClient.query.mockResolvedValue([]);

      await expect(variantRepo.bulkUpdate(updates, mockClient)).resolves.toEqual([]);
    });
  });
});
