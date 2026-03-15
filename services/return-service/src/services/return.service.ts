import { ReturnRepository, ReturnRequest, ReturnStatus, ReturnType, ReturnItem } from '../repositories/return.repository';
import { ShiprocketService } from './shiprocket.service';
import { InternalService } from './internal.service';
import { AppError, ErrorCode, logger } from '@fs/shared';

export class ReturnService {
  constructor(
    private repo: ReturnRepository,
    private shiprocket: ShiprocketService,
    private internal: InternalService
  ) {}

  async initiateReturn(
    orderId: string, 
    userId: string, 
    returnType: ReturnType, 
    items: Partial<ReturnItem>[],
    isFastTrack: boolean = false
  ): Promise<ReturnRequest> {
    // 1. Order Validation (Existence and Ownership)
    const order = await this.internal.getOrder(orderId, userId);
    
    if (order.userId !== userId) {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'This order does not belong to you');
    }

    if (order.status !== 'DELIVERED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Only delivered orders can be returned');
    }

    // 2. 7-Day Window Check
    const deliveredAt = new Date(order.deliveredAt || order.updatedAt);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Return window (7 days) has expired');
    }

    // 3. Item Validation
    const orderItems = await this.internal.getOrderItems(orderId);
    const orderItemsMap = new Map<string, number>(orderItems.map((i: any) => [i.id as string, i.quantity as number]));

    for (const item of items) {
      const orderedQty = orderItemsMap.get(item.orderItemId!);
      if (orderedQty === undefined) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, `Item ${item.orderItemId} does not belong to order ${orderId}`);
      }
      if (Number(item.quantity) > orderedQty) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, `Return quantity for item ${item.orderItemId} exceeds ordered quantity`);
      }
    }

    // 4. Create Return Request
    const newReturn = await this.repo.create(
      { orderId, userId, returnType, status: 'REQUESTED', isFastTrack },
      items
    );

    logger.info(`[ReturnService] Return ${newReturn.id} requested for order ${orderId} by user ${userId}`);
    // Emit event (simulated)
    logger.info(`[Event] return.requested: ${JSON.stringify(newReturn)}`);
    
    return newReturn;
  }

  async getReturnStatus(returnId: string): Promise<ReturnRequest> {
    const ret = await this.repo.findById(returnId);
    if (!ret) {
      throw new AppError(ErrorCode.NOT_FOUND, `Return ${returnId} not found`);
    }
    return ret;
  }

  async listReturns(status?: ReturnStatus, userId?: string): Promise<ReturnRequest[]> {
    return this.repo.getReturns({ status, userId });
  }

  async updateStatus(returnId: string, status: ReturnStatus, agentNotes?: string): Promise<ReturnRequest> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status === 'COMPLETED' || ret.status === 'REJECTED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot update status of a completed or rejected return');
    }

    const updated = await this.repo.updateStatus(returnId, status, agentNotes);
    logger.info(`[Audit] Admin updated return ${returnId} status to ${status}. Notes: ${agentNotes || 'None'}`);
    return updated;
  }

  async scheduleShiprocketPickup(returnId: string): Promise<ReturnRequest> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status !== 'APPROVED') {
       throw new AppError(ErrorCode.VALIDATION_ERROR, 'Return must be APPROVED before scheduling pickup');
    }

    // Fetch order details for address
    const order = await this.internal.getOrder(ret.orderId, ret.userId);
    
    const customer = {
      name: order.guestName || "Customer",
      phone: order.guestMobile || "9999999999",
      email: order.guestEmail || "customer@example.com",
      address: order.guestAddress || "Address",
      city: "Mumbai", 
      state: "Maharashtra",
      pincode: "400001",
      items: ret.items?.map(i => ({
        name: `Item ${i.orderItemId}`,
        sku: i.variantId,
        units: i.quantity,
        selling_price: 0 
      }))
    };

    const { pickupDate, awbCode } = await this.shiprocket.createReversePickup(returnId, ret.orderId, customer);
    const updated = await this.repo.setShiprocketId(returnId, awbCode);
    
    logger.info(`[Audit] Admin scheduled pickup for return ${returnId}. AWB: ${awbCode}, Date: ${pickupDate}`);
    return updated;
  }

  async resolveReturn(returnId: string, resolution: 'REFUND' | 'REPLACEMENT', agentNotes?: string): Promise<ReturnRequest> {
    const ret = await this.getReturnStatus(returnId);
    
    if (ret.status === 'COMPLETED' || ret.status === 'REJECTED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Return is already resolved or rejected');
    }

    return this.repo.withTransaction(async (client) => {
      if (resolution === 'REFUND') {
        const totalRefund = ret.items?.reduce((sum, item) => sum + (Number(item.refundAmount) || 0), 0) || 0;
        
        // External call (outside of strict DB rollback, but we do it first)
        await this.internal.initiateRefund(ret.orderId, totalRefund);
        
        const updated = await this.repo.resolve(returnId, { 
          status: 'COMPLETED', 
          resolvedAt: new Date() 
        }, client);

        logger.info(`[Audit] Admin resolved return ${returnId} with REFUND of ${totalRefund}`);
        logger.info(`[Event] return.refund_initiated: ${JSON.stringify(updated)}`);
        return updated;
      } else {
        // External call
        const replacementOrder = await this.internal.createReplacementOrder(ret.orderId, ret.items || []);
        
        const updated = await this.repo.resolve(returnId, { 
          status: 'COMPLETED', 
          resolvedAt: new Date(),
          replacementOrderId: replacementOrder.id
        }, client);

        logger.info(`[Audit] Admin resolved return ${returnId} with REPLACEMENT order ${replacementOrder.id}`);
        return updated;
      }
    });
  }
}
