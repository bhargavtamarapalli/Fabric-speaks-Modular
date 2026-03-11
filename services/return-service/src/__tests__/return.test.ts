import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReturnService } from '../services/return.service';
import { ReturnRepository } from '../repositories/return.repository';
import { AppError, ErrorCode } from '@fs/shared';

vi.mock('../repositories/return.repository');
vi.mock('../services/shiprocket.service');

describe('ReturnService - Edge Cases and State Machine', () => {
  let service: ReturnService;
  let mockRepo: any;
  let mockShiprocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReturnService();
    // Reassign mocked instances to private properties for testing
    mockRepo = new ReturnRepository() as any;
    (service as any).repo = mockRepo;
    mockShiprocket = (service as any).shiprocket;
  });

  describe('Initiate Return', () => {
    it('throws VALIDATION_ERROR if reason is empty', async () => {
      await expect(service.initiateReturn('order_1', 'user_1', ''))
        .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Reason is required for initiating a return'));
    });
    
    it('throws VALIDATION_ERROR if reason is only whitespace', async () => {
      await expect(service.initiateReturn('order_1', 'user_1', '   '))
        .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Reason is required for initiating a return'));
    });
  });

  describe('State Machine Updates', () => {
    it('prevents updating status if return is already RESOLVED_REFUNDED', async () => {
      mockRepo.getReturnById.mockResolvedValue({ status: 'RESOLVED_REFUNDED' });

      await expect(service.updateStatus('return_1', 'RECEIVED'))
        .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot update status of a resolved or rejected return'));
    });

    it('prevents updating status if return is already REJECTED', async () => {
      mockRepo.getReturnById.mockResolvedValue({ status: 'REJECTED' });

      await expect(service.updateStatus('return_1', 'RECEIVED'))
        .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot update status of a resolved or rejected return'));
    });
  });

  describe('Shiprocket Actions', () => {
    it('throws VALIDATION_ERROR if scheduling pickup for unapproved return', async () => {
      // Return is currently in REQUESTED state
      mockRepo.getReturnById.mockResolvedValue({ status: 'REQUESTED' });

      await expect(service.scheduleShiprocketPickup('return_1'))
        .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be APPROVED before scheduling pickup'));
    });
  });

  describe('Resolution Processing', () => {
    it('throws VALIDATION_ERROR if resolving a return that is NOT received yet', async () => {
      // e.g. Trying to refund someone before we even scheduled the pickup
      mockRepo.getReturnById.mockResolvedValue({ status: 'REQUESTED' });

      await expect(service.resolveReturn('return_1', 'REFUND'))
        .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be RECEIVED before it can be resolved'));
    });

    it('successfully processes REFUND resolution when in RECEIVED state', async () => {
      mockRepo.getReturnById.mockResolvedValue({ id: 'return_1', order_id: 'order_1', status: 'RECEIVED' });
      mockRepo.updateStatus.mockResolvedValue({ id: 'return_1', status: 'RESOLVED_REFUNDED' });

      const res = await service.resolveReturn('return_1', 'REFUND');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('return_1', 'RESOLVED_REFUNDED');
      expect(res.status).toBe('RESOLVED_REFUNDED');
    });
  });
});
