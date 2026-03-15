import { Request, Response } from 'express';
import { ReturnService } from '../services/return.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';
import { ReturnStatus } from '../repositories/return.repository';
import { updateStatusSchema, resolveReturnSchema, returnIdParamSchema } from '../schemas/return.schemas';
import { AuditLogRepository } from '../repositories/audit-log.repository';

export class ReturnController {
  constructor(
    private returnService: ReturnService,
    private auditLogRepo: AuditLogRepository
  ) {}
  
  initiateReturn = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { returnType, items, isFastTrack } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const newReturn = await this.returnService.initiateReturn(
      orderId as string, 
      userId, 
      returnType, 
      items, 
      isFastTrack
    );
    
    res.status(201).json({ success: true, data: newReturn });
  });

  getReturnStatus = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = returnIdParamSchema.parse(req.params);
    const ret = await this.returnService.getReturnStatus(returnId);
    
    const isCustomer = (req.user?.role as string) === 'customer';
    if (isCustomer && ret.userId !== req.user?.userId) {
       throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Forbidden');
    }

    res.status(200).json({ success: true, data: ret });
  });

  listReturns = catchAsync(async (req: Request, res: Response) => {
    const { status, userId } = req.query;
    const isCustomer = (req.user?.role as string) === 'customer';
    
    // Security: Customers can only see their own returns
    const targetUserId = isCustomer ? req.user?.userId : (userId as string);

    const returns = await this.returnService.listReturns(status as ReturnStatus, targetUserId);
    
    res.status(200).json({ success: true, data: returns });
  });

  updateStatus = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = returnIdParamSchema.parse(req.params);
    const { status, agentNotes } = updateStatusSchema.parse(req.body);
    
    if (!req.user?.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const adminId = req.user.userId;

    const updated = await this.returnService.updateStatus(returnId, status as ReturnStatus, adminId, agentNotes);
    
    // Rule 6: Audit log for admin write
    await this.auditLogRepo.insert({
        adminId,
        action: 'UPDATE_RETURN_STATUS',
        entityType: 'RETURN',
        entityId: returnId as string,
        afterJson: { status, agentNotes }
    });

    res.status(200).json({ success: true, data: updated });
  });

  scheduleShiprocketPickup = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = returnIdParamSchema.parse(req.params);
    
    if (!req.user?.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const adminId = req.user.userId;

    const updated = await this.returnService.scheduleShiprocketPickup(returnId, adminId);
    
    // Rule 6: Audit log
    await this.auditLogRepo.insert({
        adminId,
        action: 'SCHEDULE_PICKUP',
        entityType: 'RETURN',
        entityId: returnId as string
    });

    res.status(200).json({ success: true, data: updated });
  });

  resolveReturn = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = returnIdParamSchema.parse(req.params);
    const { resolution, agentNotes } = resolveReturnSchema.parse(req.body);
    
    if (!req.user?.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const adminId = req.user.userId;

    if (req.user.role === 'supportAgent' && resolution === 'REFUND') {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Support agents can only resolve returns with replacement');
    }

    const updated = await this.returnService.resolveReturn(returnId, resolution, adminId, agentNotes);
    
    // Rule 6: Audit log
    await this.auditLogRepo.insert({
        adminId,
        action: 'RESOLVE_RETURN',
        entityType: 'RETURN',
        entityId: returnId as string,
        afterJson: { resolution, agentNotes }
    });

    res.status(200).json({ success: true, data: updated });
  });

  getReturnTimeline = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = returnIdParamSchema.parse(req.params);
    const ret = await this.returnService.getReturnStatus(returnId);

    const isCustomer = (req.user?.role as string) === 'customer';
    if (isCustomer && ret.userId !== req.user?.userId) {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Forbidden');
    }

    const timeline = await this.returnService.getTimeline(returnId);
    const events = timeline.map((event) => ({
      status: event.status,
      timestamp: event.createdAt,
      actor: event.actorType,
      note: event.note,
      metadata: event.metadata || null,
    }));

    res.status(200).json({ success: true, data: events });
  });

  getRefundStatus = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = returnIdParamSchema.parse(req.params);
    const refundStatus = await this.returnService.getRefundStatus(returnId);

    res.status(200).json({ success: true, data: refundStatus });
  });
}
