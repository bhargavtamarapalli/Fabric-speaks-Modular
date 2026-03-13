import { ReturnRepository, ReturnRecord, ReturnStatus } from '../repositories/return.repository';
import { ShiprocketService } from './shiprocket.service';
import { AppError, ErrorCode, logger } from '@fs/shared';

export class ReturnService {
  constructor(
    private repo: ReturnRepository,
    private shiprocket: ShiprocketService
  ) {}

  async initiateReturn(orderId: string, userId: string, reason: string): Promise<ReturnRecord> {
    if (!reason || reason.trim() === '') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Reason is required for initiating a return');
    }
    
    const newReturn = await this.repo.create({ orderId, userId, reason, status: 'INITIATED', refundAmount: 0 });
    logger.info(`Customer ${userId} initiated return ${newReturn.id} for order ${orderId}`);
    return newReturn;
  }

  async getReturnStatus(returnId: string): Promise<ReturnRecord> {
    const ret = await this.repo.findById(returnId);
    if (!ret) {
      throw new AppError(ErrorCode.NOT_FOUND, `Return ${returnId} not found`);
    }
    return ret;
  }

  async listReturns(status?: ReturnStatus, userId?: string): Promise<ReturnRecord[]> {
    return this.repo.getReturns({ status, userId });
  }

  async updateStatus(returnId: string, status: ReturnStatus): Promise<ReturnRecord> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status === 'RESOLVED_REFUNDED' || ret.status === 'RESOLVED_REPLACED' || ret.status === 'REJECTED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot update status of a resolved or rejected return');
    }

    const updated = await this.repo.updateStatus(returnId, status);
    logger.info(`Admin updated return ${returnId} to ${status}`);
    return updated;
  }

  async scheduleShiprocketPickup(returnId: string): Promise<ReturnRecord> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status !== 'APPROVED') {
       throw new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be APPROVED before scheduling pickup');
    }

    const { pickupDate } = await this.shiprocket.createReversePickup(returnId, ret.orderId);
    const updated = await this.repo.setPickupDate(returnId, new Date(pickupDate));
    return updated;
  }

  async resolveReturn(returnId: string, resolution: 'REFUND' | 'REPLACEMENT'): Promise<ReturnRecord> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status !== 'RECEIVED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be RECEIVED before it can be resolved');
    }

    if (resolution === 'REFUND') {
      logger.info(`[Internal Network] Calling Payment Service to refund order ${ret.orderId}`);
      return this.repo.updateStatus(returnId, 'RESOLVED_REFUNDED');
    } else {
      logger.info(`[Internal Network] Calling Order Service to create replacement for order ${ret.orderId}`);
      return this.repo.updateStatus(returnId, 'RESOLVED_REPLACED');
    }
  }
}
