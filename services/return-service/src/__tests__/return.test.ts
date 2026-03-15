import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReturnService } from '../services/return.service';
import { AppError, ErrorCode } from '@fs/shared';

describe('ReturnService - Unit Tests', () => {
  let service: ReturnService;
  let mockRepo: any;
  let mockShiprocket: any;
  let mockInternal: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      findById: vi.fn(),
      create: vi.fn(),
      getReturns: vi.fn(),
      setShiprocketId: vi.fn(),
      resolve: vi.fn(),
      insertStatusHistory: vi.fn(),
      getOriginalOrderSummary: vi.fn().mockResolvedValue(null),
      getReplacementOrderSummary: vi.fn().mockResolvedValue(null),
      getTimeline: vi.fn().mockResolvedValue([]),
      withTransaction: vi.fn().mockImplementation((fn) => fn('mock-client'))
    };
    mockShiprocket = {
      createReversePickup: vi.fn()
    };
    mockInternal = {
      getOrder: vi.fn(),
      getOrderItems: vi.fn(),
      initiateRefund: vi.fn(),
      createReplacementOrder: vi.fn()
    };
    service = new ReturnService(mockRepo as any, mockShiprocket as any, mockInternal as any);
  });

  describe('Initiate Return', () => {
    const mockOrder = {
        id: 'order_1',
        userId: 'user_1',
        status: 'DELIVERED',
        deliveredAt: new Date().toISOString()
    };

    it('throws INSUFFICIENT_ROLE if order does not belong to user', async () => {
        mockInternal.getOrder.mockResolvedValue({ ...mockOrder, userId: 'other_user' });
        mockInternal.getOrderItems.mockResolvedValue([]);
        
        await expect(service.initiateReturn('order_1', 'user_1', 'DAMAGED', [{ orderItemId: 'item_1', variantId: 'v_1', quantity: 1 }]))
            .rejects.toThrowError(new AppError(ErrorCode.INSUFFICIENT_ROLE, 'This order does not belong to you'));
    });

    it('throws VALIDATION_ERROR if order is not delivered', async () => {
        mockInternal.getOrder.mockResolvedValue({ ...mockOrder, status: 'SHIPPED' });
        mockInternal.getOrderItems.mockResolvedValue([]);

        await expect(service.initiateReturn('order_1', 'user_1', 'DAMAGED', [{ orderItemId: 'item_1', variantId: 'v_1', quantity: 1 }]))
            .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Only delivered orders can be returned'));
    });

    it('throws VALIDATION_ERROR if 7-day window has expired', async () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10);
        mockInternal.getOrder.mockResolvedValue({ ...mockOrder, deliveredAt: oldDate.toISOString() });
        mockInternal.getOrderItems.mockResolvedValue([]);

        await expect(service.initiateReturn('order_1', 'user_1', 'DAMAGED', [{ orderItemId: 'item_1', variantId: 'v_1', quantity: 1 }]))
            .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Return window (7 days) has expired'));
    });

    it('successfully initiates return within 7-day window', async () => {
        mockInternal.getOrder.mockResolvedValue(mockOrder);
        mockInternal.getOrderItems.mockResolvedValue([{ id: 'item_1', quantity: 2 }]);
        mockRepo.create.mockResolvedValue({ id: 'ret_1', status: 'REQUESTED' });

        const res = await service.initiateReturn('order_1', 'user_1', 'DAMAGED', [{ orderItemId: 'item_1', variantId: 'v_1', quantity: 1 }]);
        
        expect(mockRepo.create).toHaveBeenCalled();
        expect(mockRepo.insertStatusHistory).toHaveBeenCalledWith('ret_1', 'REQUESTED', null, 'customer', 'user_1', expect.any(String));
        expect(res.status).toBe('REQUESTED');
    });

    it('throws VALIDATION_ERROR for invalid items', async () => {
        mockInternal.getOrder.mockResolvedValue(mockOrder);
        mockInternal.getOrderItems.mockResolvedValue([{ id: 'item_1', quantity: 2 }]);

        const promise = service.initiateReturn('order_1', 'user_1', 'DAMAGED', [{ orderItemId: 'invalid_item', variantId: 'v_1', quantity: 1 }]);
        
        await expect(promise).rejects.toThrow(/does not belong to order/);
        expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('State Machine & Admin Actions', () => {
    it('prevents updateStatus on completed return', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'ret_1', status: 'COMPLETED' });

        await expect(service.updateStatus('ret_1', 'PICKED_UP', 'admin_1'))
            .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot update status of a completed or rejected return'));
    });

    it('allows scheduling pickup only if APPROVED', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'ret_1', status: 'REQUESTED' });

        await expect(service.scheduleShiprocketPickup('ret_1', 'admin_1'))
            .rejects.toThrowError(new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be APPROVED before scheduling pickup'));
    });

    it('successfully schedules shiprocket pickup', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'ret_1', orderId: 'order_1', status: 'APPROVED', userId: 'user_1' });
        mockInternal.getOrder.mockResolvedValue({ id: 'order_1', guestName: 'Alice', guestMobile: '123' });
        mockShiprocket.createReversePickup.mockResolvedValue({ pickupDate: new Date(), awbCode: 'AWB123' });
        mockRepo.setShiprocketId.mockResolvedValue({ id: 'ret_1', status: 'PICKUP_SCHEDULED' });

        const res = await service.scheduleShiprocketPickup('ret_1', 'admin_1');
        
        expect(mockShiprocket.createReversePickup).toHaveBeenCalledWith('ret_1', 'order_1', expect.objectContaining({ name: 'Alice' }));
        expect(mockRepo.setShiprocketId).toHaveBeenCalledWith('ret_1', 'AWB123');
        expect(mockRepo.insertStatusHistory).toHaveBeenCalledWith(
            'ret_1',
            'PICKUP_SCHEDULED',
            'APPROVED',
            'courier',
            'admin_1',
            expect.any(String),
            expect.objectContaining({ awb: 'AWB123' })
        );
        expect(res.status).toBe('PICKUP_SCHEDULED');
    });
  });

  describe('Resolution', () => {
    it('successfully resolves with REFUND', async () => {
        const mockReturn = { 
            id: 'ret_1', 
            orderId: 'order_1', 
            status: 'INSPECTED', 
            items: [{ orderItemId: 'i_1', refundAmount: 100 }] 
        };
        mockRepo.findById.mockResolvedValue(mockReturn);
        mockRepo.resolve.mockResolvedValue({ ...mockReturn, status: 'COMPLETED' });

        const res = await service.resolveReturn('ret_1', 'REFUND', 'admin_1');
        
        expect(mockInternal.initiateRefund).toHaveBeenCalledWith('order_1', 100, 'ret_1');
        expect(mockRepo.resolve).toHaveBeenCalledWith('ret_1', expect.objectContaining({ status: 'COMPLETED' }), 'mock-client');
        expect(res.status).toBe('COMPLETED');
    });

    it('successfully resolves with REPLACEMENT', async () => {
        const mockReturn = { id: 'ret_1', orderId: 'order_1', status: 'INSPECTED', items: [] };
        mockRepo.findById.mockResolvedValue(mockReturn);
        mockInternal.createReplacementOrder.mockResolvedValue({ id: 'replacement_1' });
        mockRepo.resolve.mockResolvedValue({ ...mockReturn, status: 'COMPLETED', replacementOrderId: 'replacement_1' });

        const res = await service.resolveReturn('ret_1', 'REPLACEMENT', 'admin_1');
        
        expect(mockInternal.createReplacementOrder).toHaveBeenCalledWith('order_1', [], 'ret_1');
        expect(mockRepo.resolve).toHaveBeenCalledWith('ret_1', expect.objectContaining({ replacementOrderId: 'replacement_1' }), 'mock-client');
        expect(res.status).toBe('COMPLETED');
    });
  });
});
