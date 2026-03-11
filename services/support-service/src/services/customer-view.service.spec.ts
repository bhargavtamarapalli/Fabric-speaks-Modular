import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerViewService } from './customer-view.service';
import { query } from '@fs/shared/db';
import { AppError } from '@fs/shared/errors';

vi.mock('@fs/shared/db', () => ({
  query: vi.fn()
}));
vi.mock('@fs/shared/logger', () => ({
  maskMobile: vi.fn((m) => `******${m.substring(m.length - 4)}`)
}));

describe('CustomerViewService (SUP-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw AppError if customer is not found (Edge Case)', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0, command: '', fields: [] } as any);

    await expect(CustomerViewService.getCustomer360ByMobile('9999999999'))
      .rejects.toThrowError('Customer not found by mobile');
  });

  it('should successfully build a 360 view verifying RULE 1 and RULE 5', async () => {
    // 1. Mock Customer lookup
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ id: 'user-1', name: 'John Doe', mobile: '9876543210', isWaOptedIn: true, joinedAt: new Date() }],
      rowCount: 1, command: '', fields: []
    } as any);

    // 2. Mock Orders
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        { id: 'order-1', displayId: 'FS-001', status: 'DELIVERED', totalAmount: '1500.00' },
        { id: 'order-2', displayId: 'FS-002', status: 'SHIPPED', totalAmount: '500.00' }
      ],
      rowCount: 2, command: '', fields: []
    } as any);

    // 3. Mock Returns
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        { id: 'ret-1', orderId: 'order-3', status: 'REFUNDED', refundAmount: '1000.00' }
      ],
      rowCount: 1, command: '', fields: []
    } as any);

    const result = await CustomerViewService.getCustomer360ByMobile('9876543210');

    // RULE 5 Verification check: Data leaving the service is safely masked
    expect(result.customer.mobile).toBe('******3210');

    // RULE 1 Verification check: Lifetime Value mathematically calculates directly from DB `total_amount` ONLY where delivered
    expect(result.metrics.lifetimeValue).toBe(1500); // Only DELIVERED order counts
    expect(result.metrics.totalOrders).toBe(2);
    expect(result.metrics.totalReturns).toBe(1);
  });
});
