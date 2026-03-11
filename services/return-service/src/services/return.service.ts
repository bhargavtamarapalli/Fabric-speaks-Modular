import { ReturnRepository, ReturnEntity, ReturnStatus } from '../repositories/return.repository';
import { ShiprocketService } from './shiprocket.service';
import { AppError, ErrorCode, logger } from '@fs/shared';
// In a real app we'd use an api client like axios to call internal services
// import axios from 'axios';

export class ReturnService {
  private repo: ReturnRepository;
  private shiprocket: ShiprocketService;

  constructor() {
    this.repo = new ReturnRepository();
    this.shiprocket = new ShiprocketService();
  }

  async initiateReturn(orderId: string, userId: string, reason: string): Promise<ReturnEntity> {
    if (!reason || reason.trim() === '') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Reason is required for initiating a return');
    }
    
    const newReturn = await this.repo.createReturn(orderId, userId, reason);
    logger.info(`Customer ${userId} initiated return ${newReturn.id} for order ${orderId}`);
    return newReturn;
  }

  async getReturnStatus(returnId: string): Promise<ReturnEntity> {
    const ret = await this.repo.getReturnById(returnId);
    if (!ret) {
      throw new AppError(ErrorCode.NOT_FOUND, `Return ${returnId} not found`);
    }
    return ret;
  }

  async listReturns(status?: ReturnStatus, userId?: string): Promise<ReturnEntity[]> {
    return this.repo.getReturns({ status, userId });
  }

  async updateStatus(returnId: string, status: ReturnStatus): Promise<ReturnEntity> {
    const ret = await this.getReturnStatus(returnId);
    
    // Basic state machine validation
    if (ret.status === 'RESOLVED_REFUNDED' || ret.status === 'RESOLVED_REPLACED' || ret.status === 'REJECTED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot update status of a resolved or rejected return');
    }

    const updated = await this.repo.updateStatus(returnId, status);
    logger.info(`Admin updated return ${returnId} to ${status}`);
    return updated;
  }

  async scheduleShiprocketPickup(returnId: string): Promise<ReturnEntity> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status !== 'APPROVED') {
       throw new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be APPROVED before scheduling pickup');
    }

    const { pickup_date } = await this.shiprocket.createReversePickup(returnId, ret.order_id);
    const updated = await this.repo.setPickupDate(returnId, pickup_date);
    return updated;
  }

  async resolveReturn(returnId: string, resolution: 'REFUND' | 'REPLACEMENT'): Promise<ReturnEntity> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status !== 'RECEIVED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be RECEIVED before it can be resolved');
    }

    if (resolution === 'REFUND') {
      // Proxy call to Payment Service POST /admin/payments/:orderId/refund
      logger.info(`[Internal Network] Calling Payment Service to refund order ${ret.order_id}`);
      // await axios.post(`http://payment-service:3005/admin/payments/${ret.order_id}/refund`);
      return this.repo.updateStatus(returnId, 'RESOLVED_REFUNDED');
    } else {
      // Proxy call to Order Service to create a replacement
      logger.info(`[Internal Network] Calling Order Service to create replacement for order ${ret.order_id}`);
      // await axios.post(`http://order-service:3004/orders/internal/replacement`, { originalOrderId: ret.order_id });
      return this.repo.updateStatus(returnId, 'RESOLVED_REPLACED');
    }
  }
}
