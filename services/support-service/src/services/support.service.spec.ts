import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supportService } from './support.service';
import { supportQueryRepository } from '../repositories/support.repository';
import { AppError } from '@fs/shared/errors';

vi.mock('../repositories/support.repository');
vi.mock('./customer-view.service', () => ({
  CustomerViewService: {
    getOrderHistorySnippet: vi.fn().mockResolvedValue({ status: 'DELIVERED', totalAmount: '1500.00' })
  }
}));

describe('SupportService (SUP-02, SUP-03, SUP-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCaseDetail (SUP-02)', () => {
    it('should fetch case and hydrate order context if associated with an order', async () => {
      vi.mocked(supportQueryRepository.findById).mockResolvedValue({
        id: 'case-123',
        orderId: 'order-456',
        status: 'open'
      });

      const result = await supportService.getCaseDetail('case-123');

      expect(result.id).toBe('case-123');
      // Order context dynamically merged in
      expect(result.orderContext).toEqual({ status: 'DELIVERED', totalAmount: '1500.00' });
    });

    it('should throw AppError NOT_FOUND if case does not exist', async () => {
      vi.mocked(supportQueryRepository.findById).mockResolvedValue(null);

      await expect(supportService.getCaseDetail('missing-case'))
        .rejects.toThrowError('Support case not found');
    });
  });

  describe('updateCase (SUP-03)', () => {
    it('should dynamically update status, priority, and append a note exclusively using JWT agentId (RULE 2)', async () => {
      vi.mocked(supportQueryRepository.findById).mockResolvedValue({ id: 'case-123' });
      vi.mocked(supportQueryRepository.updateStatus).mockResolvedValue();
      vi.mocked(supportQueryRepository.addNote).mockResolvedValue();

      await supportService.updateCase('case-123', { status: 'resolved', note: 'Customer satisfied', priority: 'P1' }, 'agent-777');

      // Enforcing RULE 2
      expect(supportQueryRepository.addNote).toHaveBeenCalledWith('case-123', 'agent-777', 'Customer satisfied');
      expect(supportQueryRepository.updateStatus).toHaveBeenCalledWith('case-123', 'resolved', 'P1');
    });
  });
});
