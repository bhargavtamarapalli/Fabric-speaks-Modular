import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../src/services/order.service';
import { OrderRepository } from '../../src/repositories/order.repository';
import { AuditLogRepository } from '../../src/repositories/audit_log.repository';
import { AppError, ErrorCode } from '@fs/shared/src/errors';

describe('OrderService - Status Machine', () => {
  let orderService: OrderService;
  let mockOrderRepo: any;
  let mockAuditLogRepo: any;

  beforeEach(() => {
    mockOrderRepo = {
      updateOrderStatus: vi.fn(),
      getOrderById: vi.fn(),
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
    const newStatus = 'SHIPPED';
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: 'DELIVERED' });
    mockOrderRepo.updateOrderStatus.mockResolvedValue({ id: orderId, status: newStatus });

    const result = await orderService.updateOrderStatus(orderId, newStatus);

    expect(result!.status).toBe(newStatus);
    expect(mockOrderRepo.updateOrderStatus).toHaveBeenCalledWith(orderId, newStatus);
  });

  it('should throw VALIDATION_ERROR for an invalid state', async () => {
    const orderId = 'order-123';
    const invalidStatus = 'INVALID_STATUS';

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
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: 'PLAIN' }); // Dummy current
    mockOrderRepo.updateOrderStatus.mockResolvedValue({ id: orderId, status: newStatus });

    const result = await orderService.updateOrderStatus(orderId, newStatus);

    expect(result!.status).toBe(newStatus);
  });
});
