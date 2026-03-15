import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../../services/inventory.service';
import { AppError, ErrorCode } from '@fs/shared';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({}),
    close: vi.fn().mockResolvedValue({}),
  })),
}));

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
      getById: vi.fn(),
      receiveArrival: vi.fn(),
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

      const result = await inventoryService.manualAdjustment(variantId, 20, 'correction', adminUserId);

      expect(result).toEqual(updatedVariant);
      expect(mockInvRepo.adjustStock).toHaveBeenCalledWith(variantId, 20, 'correction', adminUserId);
      expect(mockAuditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        adminId: adminUserId,
        action: 'MANUAL_STOCK_ADJUSTMENT',
        entityId: variantId,
        beforeJson: { stockQty: 10 },
        afterJson: { stockQty: 20, reason: 'correction' }
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
        expected_date: new Date('2026-04-01'),
        created_by: 'admin-id'
      };
      const createdArrival = { id: 'arr-1', ...arrivalData, is_received: false };

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
        `${variantId1},15,correction\n` +
        `${variantId2},-10,damaged\n` + // Invalid qty
        `invalid-uuid,20,other\n`; // Invalid UUID

      mockInvRepo.getVariant.mockImplementation((id: string) => {
        if (id === variantId1) return Promise.resolve({ variantId: id, stockQty: 10 });
        return Promise.resolve(null);
      });

      mockInvRepo.adjustStock.mockResolvedValue({ variantId: variantId1, stockQty: 15, productName: 'Test Product' });

      const buffer = Buffer.from(csvContent);
      const response = await inventoryService.bulkAdjustment(buffer, 'admin-id');

      expect(response.success).toBe(1);
      expect(response.failed).toBe(2);
      expect(response.errors.length).toBe(2);
      expect(mockInvRepo.adjustStock).toHaveBeenCalledTimes(1);
    });

    it('should emit stock.low event if stock is below 5', async () => {
      const variantId = 'eeb7c044-67d4-42b7-873b-7a33e382d67d';
      const currentVariant = { variantId, stockQty: 10, productName: 'Test' };
      const updatedVariant = { variantId, stockQty: 3, productName: 'Test' };

      mockInvRepo.getVariant.mockResolvedValue(currentVariant);
      mockInvRepo.adjustStock.mockResolvedValue(updatedVariant);

      await inventoryService.manualAdjustment(variantId, 3, 'correction', 'admin');

      const { Queue } = await import('bullmq');
      const mockQueue = vi.mocked(Queue);
      
      // Check ALL instances created
      const addCalls = mockQueue.mock.results.flatMap(r => r.value.add.mock.calls);
      const stockLowCall = addCalls.find(c => c[0] === 'stock.low');
      
      expect(stockLowCall).toBeDefined();
      expect(stockLowCall![1]).toEqual(expect.objectContaining({
        variantId,
        stockCount: 3
      }));
    });
  });

  describe('markArrivalReceived', () => {
    it('should mark arrival as received and create audit log', async () => {
      const arrivalId = 'arr-123';
      const adminUserId = 'admin-456';
      const arrival = {
        id: arrivalId,
        variant_id: 'var-789',
        expected_qty: 10,
        is_received: false
      };

      mockExpectedRepo.getById.mockResolvedValue(arrival);
      mockExpectedRepo.receiveArrival.mockResolvedValue(undefined);
      mockInvRepo.getVariant.mockResolvedValue({ variantId: 'var-789', stockQty: 10, productName: 'Test' });

      await inventoryService.markArrivalReceived(arrivalId, adminUserId);

      expect(mockExpectedRepo.receiveArrival).toHaveBeenCalledWith(arrivalId, adminUserId);
      expect(mockAuditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MARK_ARRIVAL_RECEIVED',
        entityId: arrivalId
      }));
    });

    it('should throw NOT_FOUND if arrival does not exist', async () => {
      mockExpectedRepo.getById.mockResolvedValue(null);
      await expect(inventoryService.markArrivalReceived('invalid', 'admin'))
        .rejects.toThrow(AppError);
    });

    it('should throw VALIDATION_ERROR if already received', async () => {
      mockExpectedRepo.getById.mockResolvedValue({ id: '1', is_received: true });
      await expect(inventoryService.markArrivalReceived('1', 'admin'))
        .rejects.toThrow(AppError);
    });
  });
});
