import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../../services/inventory.service';
import { AppError, ErrorCode } from '@fs/shared';

describe('InventoryService', () => {
  let inventoryService: InventoryService;
  let mockInvRepo: any;
  let mockExpectedRepo: any;
  let mockAuditLogRepo: any;

  beforeEach(() => {
    mockInvRepo = {
      getAllVariants: vi.fn(),
      getVariant: vi.fn(),
      adjustStock: vi.fn(),
      getHealthSummary: vi.fn(),
    };
    mockExpectedRepo = {
      addExpectedStock: vi.fn(),
      getPendingArrivals: vi.fn(),
    };
    mockAuditLogRepo = {
      insert: vi.fn(),
    };

    inventoryService = new InventoryService(mockInvRepo, mockExpectedRepo, mockAuditLogRepo);
  });

  describe('manualAdjustment', () => {
    it('should adjust stock and create audit log', async () => {
      const variantId = 'eeb7c044-67d4-42b7-873b-7a33e382d67d';
      const adminUserId = '51d382d6-7a3b-42b7-873b-7a33e382d67e';
      const currentVariant = { variantId, stockQty: 10 };
      const updatedVariant = { variantId, stockQty: 20 };

      mockInvRepo.getVariant.mockResolvedValue(currentVariant);
      mockInvRepo.adjustStock.mockResolvedValue(updatedVariant);

      const result = await inventoryService.manualAdjustment(variantId, 20, 'Restock', adminUserId);

      expect(result).toEqual(updatedVariant);
      expect(mockInvRepo.adjustStock).toHaveBeenCalledWith(variantId, 20, 'Restock', adminUserId);
      expect(mockAuditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        adminId: adminUserId,
        action: 'MANUAL_STOCK_ADJUSTMENT',
        entityId: variantId,
        beforeJson: { stockQty: 10 },
        afterJson: { stockQty: 20, reason: 'Restock' }
      }));
    });

    it('should throw NOT_FOUND if variant does not exist', async () => {
      mockInvRepo.getVariant.mockResolvedValue(null);

      await expect(inventoryService.manualAdjustment('some-id', 20, 'test', 'admin'))
        .rejects.toThrow(AppError);
    });
  });

  describe('addExpectedArrival', () => {
    it('should add arrival and create audit log', async () => {
      const variantId = 'eeb7c044-67d4-42b7-873b-7a33e382d67d';
      const arrivalData = {
        variant_id: variantId,
        expected_qty: 50,
        arrival_date: new Date('2026-04-01')
      };
      const createdArrival = { id: 'arr-1', ...arrivalData };

      mockInvRepo.getVariant.mockResolvedValue({ variantId, stockQty: 0 });
      mockExpectedRepo.addExpectedStock.mockResolvedValue(createdArrival);

      const result = await inventoryService.addExpectedArrival(arrivalData, 'admin-id');

      expect(result).toEqual(createdArrival);
      expect(mockAuditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'ADD_EXPECTED_ARRIVAL',
        entityId: 'arr-1'
      }));
    });
  });

  describe('bulkAdjustment', () => {
    it('should process valid rows and skip invalid ones', async () => {
      const variantId1 = 'eeb7c044-67d4-42b7-873b-7a33e382d67d';
      const variantId2 = 'f123c044-67d4-42b7-873b-7a33e382d67a';
      const csvContent = 
        `variant_id,new_qty,reason\n` +
        `${variantId1},15,Audit\n` +
        `${variantId2},-10,Error\n` + // Invalid qty
        `invalid-uuid,20,Broken\n`; // Invalid UUID

      mockInvRepo.getVariant.mockImplementation((id: string) => {
        if (id === variantId1) return Promise.resolve({ variantId: id, stockQty: 10 });
        return Promise.resolve(null);
      });

      mockInvRepo.adjustStock.mockResolvedValue({ variantId: variantId1, stockQty: 15 });

      const buffer = Buffer.from(csvContent);
      const response = await inventoryService.bulkAdjustment(buffer, 'admin-id');

      expect(response.success).toBe(1);
      expect(response.failed).toBe(2);
      expect(response.errors.length).toBe(2);
      expect(mockInvRepo.adjustStock).toHaveBeenCalledTimes(1);
    });
  });
});
