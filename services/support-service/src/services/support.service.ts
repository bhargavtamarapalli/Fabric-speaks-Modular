import { SupportRepository } from '../repositories/support.repository';
import { CustomerViewService } from './customer-view.service';
import { SupportQueueQueryDto, UpdateQueryDto } from '../schemas/support.schemas';
import { AppError, ErrorCode, logger } from '@fs/shared';

export class SupportService {
  constructor(
    private supportRepo: SupportRepository,
    private customerViewService: CustomerViewService
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
      await this.supportRepo.updateStatus(caseId, data.status, data.priority);
    }

    if (data.note) {
      await this.supportRepo.addNote(caseId, adminId, data.note);
    }

    return this.getCaseDetail(caseId);
  }

  async addNote(caseId: string, text: string, adminId: string) {
    const caseData = await this.supportRepo.findById(caseId);
    if (!caseData) throw new AppError(ErrorCode.NOT_FOUND, 'Support case not found');

    await this.supportRepo.addNote(caseId, adminId, text);
    
    return { success: true };
  }
}
