import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../src/services/order.service';
import { OrderRepository } from '../../src/repositories/order.repository';
import { AuditLogRepository } from '../../src/repositories/audit_log.repository';
import { AppError, ErrorCode } from '@fs/shared/src/errors';

vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({
    add: vi.fn(),
    on: vi.fn(),
  })),
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('OrderService - Status Machine', () => {
  let orderService: OrderService;
  let mockOrderRepo: any;
  let mockAuditLogRepo: any;

  beforeEach(() => {
    mockOrderRepo = {
      updateOrderStatus: vi.fn(),
      getOrderById: vi.fn(),
      insertOrderStatusHistory: vi.fn(),
      getOrderHistory: vi.fn(),
      getPaymentByOrderId: vi.fn(),
      markPaymentRefunded: vi.fn(),
      restockOrderItems: vi.fn(),
      withTransaction: vi.fn().mockImplementation((fn) => fn('mock-client')),
    };
    mockAuditLogRepo = {
      insert: vi.fn(),
    };
    orderService = new OrderService(
      mockOrderRepo as unknown as OrderRepository,
      mockAuditLogRepo as unknown as AuditLogRepository
    );
    vi.clearAllMocks();
  });

  it('should successfully update status for a valid state', async () => {
    const orderId = 'order-123';
    const newStatus = 'PAYMENT_PENDING';
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: 'PLACED' });
    mockOrderRepo.updateOrderStatus.mockResolvedValue({ id: orderId, status: newStatus });

    const result = await orderService.updateOrderStatus(orderId, newStatus);

    expect(result!.status).toBe(newStatus);
    expect(mockOrderRepo.updateOrderStatus).toHaveBeenCalledWith(orderId, newStatus);
  });

  it('should throw VALIDATION_ERROR for an invalid state', async () => {
    const orderId = 'order-123';
    const invalidStatus = 'INVALID_STATUS';
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: 'PLACED' });

    await expect(orderService.updateOrderStatus(orderId, invalidStatus))
      .rejects.toThrow(AppError);
    
    try {
      await orderService.updateOrderStatus(orderId, invalidStatus);
    } catch (e: any) {
      expect(e.code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it('should allow cancellation if logic permits (stub)', async () => {
    const orderId = 'order-123';
    const newStatus = 'CANCELLED';
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: 'PLACED' }); 
    mockOrderRepo.updateOrderStatus.mockResolvedValue({ id: orderId, status: newStatus });

    const result = await orderService.updateOrderStatus(orderId, newStatus);

    expect(result!.status).toBe(newStatus);
  });

  it('should map timeline actors for admin and courier events', async () => {
    const orderId = 'order-123';
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, user_id: 'user-1', status: 'SHIPPED' });
    mockOrderRepo.getOrderHistory.mockResolvedValue([
      { status: 'CONFIRMED', createdAt: new Date().toISOString(), timelineActorId: 'admin-1', timelineActorType: 'admin', timelineNote: null },
      { status: 'SHIPPED', createdAt: new Date().toISOString(), timelineActorId: null, timelineActorType: 'courier', timelineNote: 'Shiprocket webhook: in_transit' },
    ]);

    const result = await orderService.getOrderTimeline(orderId, null);

    expect(result).toEqual([
      expect.objectContaining({ status: 'CONFIRMED', actor: 'admin' }),
      expect.objectContaining({ status: 'SHIPPED', actor: 'courier' }),
    ]);
  });

  it('should cancel a confirmed order and restock items', async () => {
    const orderId = 'order-123';
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: 'CONFIRMED' });
    mockOrderRepo.getPaymentByOrderId.mockResolvedValue(null);
    mockOrderRepo.updateOrderStatus.mockResolvedValue({ id: orderId, status: 'CANCELLED' });

    const result = await orderService.cancelOrder(orderId, 'admin-1', 'Customer requested cancellation before dispatch');

    expect(mockOrderRepo.restockOrderItems).toHaveBeenCalledWith('mock-client', orderId);
    expect(mockOrderRepo.insertOrderStatusHistory).toHaveBeenCalledWith(
      'mock-client',
      expect.objectContaining({
        orderId,
        status: 'CANCELLED',
        previousStatus: 'CONFIRMED',
        actorType: 'admin',
        actorId: 'admin-1',
      })
    );
    expect(result!.status).toBe('CANCELLED');
  });
});
