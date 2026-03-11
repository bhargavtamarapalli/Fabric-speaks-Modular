import { supportQueryRepository } from '../repositories/support.repository';
import { CustomerViewService } from './customer-view.service';
import { SupportQueueQueryDto, UpdateQueryDto } from '../schemas/support.schemas';
import { AppError, ErrorCode } from '@fs/shared/errors';

export class SupportService {
  async getQueue(filters: SupportQueueQueryDto) {
    return supportQueryRepository.listQueue(filters);
  }

  async getCaseDetail(caseId: string) {
    const caseData = await supportQueryRepository.findById(caseId);
    if (!caseData) throw new AppError(ErrorCode.NOT_FOUND, 'Support case not found');

    // If case has an associated order, fetch full order context (RULE 1 applies here via CustomerViewService)
    if (caseData.orderId) {
      caseData.orderContext = await CustomerViewService.getOrderHistorySnippet(caseData.orderId);
    }

    return caseData;
  }

  async updateCase(caseId: string, data: UpdateQueryDto, adminId: string) {
    const caseData = await supportQueryRepository.findById(caseId);
    if (!caseData) throw new AppError(ErrorCode.NOT_FOUND, 'Support case not found');

    // Patch status/priority
    if (data.status || data.priority) {
      await supportQueryRepository.updateStatus(caseId, data.status, data.priority);
    }

    // Add note if provided (RULE 2 applied: uses adminId directly from JWT context)
    if (data.note) {
      await supportQueryRepository.addNote(caseId, adminId, data.note);
    }

    // Re-fetch updated case
    return this.getCaseDetail(caseId);
  }

  async addNote(caseId: string, text: string, adminId: string) {
    const caseData = await supportQueryRepository.findById(caseId);
    if (!caseData) throw new AppError(ErrorCode.NOT_FOUND, 'Support case not found');

    await supportQueryRepository.addNote(caseId, adminId, text);
    
    return { success: true };
  }
}

export const supportService = new SupportService();
