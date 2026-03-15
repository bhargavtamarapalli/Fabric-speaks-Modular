import { SupportRepository } from '../repositories/support.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { CustomerViewService } from './customer-view.service';
import { SupportQueueQueryDto, UpdateQueryDto } from '../schemas/support.schemas';
import { AppError, ErrorCode, logger } from '@fs/shared';
import { CustomerFlagRepository } from '../repositories/customer-flag.repository';

export class SupportService {
  constructor(
    private supportRepo: SupportRepository,
    private auditLogRepo: AuditLogRepository,
    private customerViewService: CustomerViewService,
    private customerFlagRepo: CustomerFlagRepository
  ) {}

  async getQueue(filters: SupportQueueQueryDto) {
    return this.supportRepo.listQueue(filters);
  }

  async getCaseDetail(caseId: string) {
    const caseData = await this.supportRepo.findById(caseId);
    if (!caseData) throw new AppError(ErrorCode.NOT_FOUND, 'Support case not found');

    if (caseData.orderId) {
      caseData.orderContext = await this.customerViewService.getOrderHistorySnippet(caseData.orderId);
    }

    return caseData;
  }

  async updateCase(caseId: string, data: UpdateQueryDto, adminId: string) {
    const caseData = await this.supportRepo.findById(caseId);
    if (!caseData) throw new AppError(ErrorCode.NOT_FOUND, 'Support case not found');

    if (data.status || data.priority) {
      const before: any = {};
      if (data.status) before.status = caseData.status;
      if (data.priority) before.priority = caseData.priority;

      await this.supportRepo.updateStatus(caseId, data.status, data.priority);

      // Rule 6: Audit log
      await this.auditLogRepo.insert({
        adminId,
        action: 'UPDATE_SUPPORT_CASE',
        entityType: 'SUPPORT_CASE',
        entityId: caseId,
        beforeJson: before,
        afterJson: { status: data.status, priority: data.priority }
      });
    }

    if (data.note) {
      await this.supportRepo.addNote(caseId, adminId, data.note);
      
      // Rule 6: Audit log
      await this.auditLogRepo.insert({
        adminId,
        action: 'ADD_SUPPORT_NOTE',
        entityType: 'SUPPORT_CASE',
        entityId: caseId,
        afterJson: { noteSnippet: data.note.substring(0, 50) }
      });
    }

    return this.getCaseDetail(caseId);
  }

  async addNote(caseId: string, text: string, adminId: string) {
    const caseData = await this.supportRepo.findById(caseId);
    if (!caseData) throw new AppError(ErrorCode.NOT_FOUND, 'Support case not found');

    await this.supportRepo.addNote(caseId, adminId, text);
    
    // Rule 6: Audit log
    await this.auditLogRepo.insert({
      adminId,
      action: 'ADD_SUPPORT_NOTE',
      entityType: 'SUPPORT_CASE',
      entityId: caseId,
      afterJson: { noteSnippet: text.substring(0, 50) }
    });
    
    return { success: true };
  }

  async upsertCustomerFlag(userId: string, flagType: 'VIP' | 'FRAUD', note: string | null, adminId: string) {
    const existing = await this.customerFlagRepo.findActiveByUserAndType(userId, flagType);
    let flag;
    if (existing) {
      flag = await this.customerFlagRepo.updateFlag(existing.id, note, adminId);
    } else {
      flag = await this.customerFlagRepo.createFlag(userId, flagType, note, adminId);
    }

    await this.auditLogRepo.insert({
      adminId,
      action: 'UPDATE_CUSTOMER_FLAG',
      entityType: 'CUSTOMER',
      entityId: userId,
      afterJson: { flagType, note }
    });

    return flag;
  }
}
