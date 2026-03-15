import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../src/services/order.service';
import { OrderRepository } from '../../src/repositories/order.repository';
import { AuditLogRepository } from '../../src/repositories/audit_log.repository';
import { AppError, ErrorCode } from '@fs/shared/src/errors';
import { getDbPool } from '@fs/shared/src/db';
import { AuditLogRepository } from '../../src/repositories/audit_log.repository';

vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({
    add: vi.fn(),
    on: vi.fn(),
  })),
}));

vi.mock('@fs/shared/src/db', () => ({
  getDbPool: vi.fn(() => ({
    connect: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn(),
    })),
  })),
}));

describe('OrderService - Stock Locking (OCC)', () => {
  let orderService: OrderService;
  let mockOrderRepo: any;
  let mockAuditLogRepo: any;
  let mockClient: any;
  let mockAuditLogRepo: any;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    (getDbPool as any).mockReturnValue({
      connect: vi.fn().mockResolvedValue(mockClient),
    });

    mockOrderRepo = {
      getVariantForLock: vi.fn(),
      lockStockWithOCC: vi.fn(),
      createOrder: vi.fn(),
      createOrderItem: vi.fn(),
      createGstInvoice: vi.fn(),
      insertOrderStatusHistory: vi.fn(),
      checkCODHistoryFlag: vi.fn(),
      flagOrderForCOD_Fraud: vi.fn(),
      clearUserCart: vi.fn(),
      getUserDetails: vi.fn(),
      getAddressById: vi.fn(),
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

  it('should fail if stock is unavailable', async () => {
    const payload = {
      cart_items: [{ variant_id: 'v1', quantity: 10 }],
      address_id: 'addr1',
      payment_method: 'CARD'
    };
    
    mockOrderRepo.getVariantForLock.mockResolvedValue({
      id: 'v1', qty: 5, base_price: 1000, version: 1, name: 'Test Variant'
    });

    await expect(orderService.placeOrder('u1', payload))
      .rejects.toThrow(/Stock unavailable/);
  });

  it('should retry or fail if OCC locking fails (simulated concurrent update)', async () => {
    const payload = {
      cart_items: [{ variant_id: 'v1', quantity: 1 }],
      address_id: 'addr1',
      payment_method: 'CARD'
    };

    mockOrderRepo.getVariantForLock.mockResolvedValue({
      id: 'v1', qty: 10, base_price: 1000, version: 1, name: 'Test Variant', product_id: 'p1'
    });
    
    // Simulate lockStockWithOCC returning false (meaning version mismatch)
    mockOrderRepo.lockStockWithOCC.mockResolvedValue(false);

    await expect(orderService.placeOrder('u1', payload))
      .rejects.toThrow(/Concurrent stock update failed/);
  });

  it('should successfully place order when stock is available and lock succeeds', async () => {
    const payload = {
      cart_items: [{ variant_id: 'v1', quantity: 1 }],
      address_id: 'addr1',
      payment_method: 'CARD'
    };

    mockOrderRepo.getVariantForLock.mockResolvedValue({
      id: 'v1', qty: 10, base_price: 1000, version: 1, name: 'Test Variant', product_id: 'p1', sale_active: false
    });
    mockOrderRepo.lockStockWithOCC.mockResolvedValue(true);
    mockOrderRepo.createOrder.mockResolvedValue({ id: 'o1', status: 'PAYMENT_PENDING' });

    const result = await orderService.placeOrder('u1', payload);

    expect(result.id).toBe('o1');
    expect(mockOrderRepo.lockStockWithOCC).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    
    // Verify Queue call
    const { Queue } = await import('bullmq');
    const results = vi.mocked(Queue).mock.results;
    if (results && results[0]) {
        const queueInstance = results[0].value;
        if (queueInstance) {
            expect(queueInstance.add).toHaveBeenCalledWith('order.created', expect.objectContaining({
                orderId: 'o1',
                status: 'PAYMENT_PENDING'
            }));
        }
    }
  });

  it('should flag order for COD fraud if user has 2+ cancels', async () => {
    const payload = {
      cart_items: [{ variant_id: 'v1', quantity: 1 }],
      address_id: 'addr1',
      payment_method: 'COD'
    };

    mockOrderRepo.getVariantForLock.mockResolvedValue({
      id: 'v1', qty: 10, base_price: 1000, version: 1, name: 'Test Variant', product_id: 'p1', sale_active: false
    });
    mockOrderRepo.lockStockWithOCC.mockResolvedValue(true);
    mockOrderRepo.createOrder.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });
    mockOrderRepo.checkCODHistoryFlag.mockResolvedValue(3); // 3 cancels

    await orderService.placeOrder('u1', payload);

    expect(mockOrderRepo.flagOrderForCOD_Fraud).toHaveBeenCalledWith('o1');
  });
});
