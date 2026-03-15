import { SupportService } from './support.service';
import { SupportRepository } from '../repositories/support.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { CustomerViewService } from './customer-view.service';
import { AppError } from '@fs/shared';

vi.mock('../repositories/support.repository');
vi.mock('../repositories/audit-log.repository');
vi.mock('./customer-view.service');

describe('SupportService (SUP-02, SUP-03, SUP-05)', () => {
  let supportService: SupportService;
  let supportRepo: SupportRepository;
  let auditLogRepo: AuditLogRepository;
  let customerViewService: CustomerViewService;

  beforeEach(() => {
    vi.clearAllMocks();
    supportRepo = new SupportRepository({} as any);
    auditLogRepo = new AuditLogRepository({} as any);
    customerViewService = new CustomerViewService({} as any);
    supportService = new SupportService(supportRepo, auditLogRepo, customerViewService);
  });

  describe('getCaseDetail (SUP-02)', () => {
    it('should fetch case and hydrate order context if associated with an order', async () => {
      vi.mocked(supportRepo.findById).mockResolvedValue({
        id: 'case-123',
        orderId: 'order-456',
        status: 'open'
      });
      vi.mocked(customerViewService.getOrderHistorySnippet).mockResolvedValue({ status: 'DELIVERED', totalAmount: '1500.00' } as any);

      const result = await supportService.getCaseDetail('case-123');

      expect(result.id).toBe('case-123');
      expect(result.orderContext).toEqual({ status: 'DELIVERED', totalAmount: '1500.00' });
    });

    it('should throw AppError NOT_FOUND if case does not exist', async () => {
      vi.mocked(supportRepo.findById).mockResolvedValue(null);

      await expect(supportService.getCaseDetail('missing-case'))
        .rejects.toThrowError('Support case not found');
    });
  });

  describe('updateCase (SUP-03)', () => {
    it('should dynamically update status, priority, and append a note exclusively using JWT adminId (RULE 2/6)', async () => {
      vi.mocked(supportRepo.findById).mockResolvedValue({ id: 'case-123', status: 'open', priority: 'P3' });
      vi.mocked(supportRepo.updateStatus).mockResolvedValue();
      vi.mocked(supportRepo.addNote).mockResolvedValue();
      vi.mocked(auditLogRepo.insert).mockResolvedValue();

      await supportService.updateCase('case-123', { status: 'resolved', note: 'Customer satisfied', priority: 'P1' }, 'agent-777');

      expect(supportRepo.addNote).toHaveBeenCalledWith('case-123', 'agent-777', 'Customer satisfied');
      expect(supportRepo.updateStatus).toHaveBeenCalledWith('case-123', 'resolved', 'P1');
      
      // Rule 6 check
      expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        adminId: 'agent-777',
        action: 'UPDATE_SUPPORT_CASE',
        entityId: 'case-123'
      }));
    });
  });
});
