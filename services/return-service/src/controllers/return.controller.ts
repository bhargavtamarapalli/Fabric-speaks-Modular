import { Request, Response } from 'express';
import { ReturnService } from '../services/return.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';
import { ReturnStatus } from '../repositories/return.repository';
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
    const { returnId } = req.params;
    const ret = await this.returnService.getReturnStatus(returnId as string);
    
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
    const { returnId } = req.params;
    const { status, agentNotes } = req.body;
    
    if (!req.user?.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const adminId = req.user.userId;

    const updated = await this.returnService.updateStatus(returnId as string, status as ReturnStatus, agentNotes);
    
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
    const { returnId } = req.params;
    
    if (!req.user?.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const adminId = req.user.userId;

    const updated = await this.returnService.scheduleShiprocketPickup(returnId as string);
    
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
    const { returnId } = req.params;
    const { resolution, agentNotes } = req.body;
    
    if (!req.user?.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const adminId = req.user.userId;

    const updated = await this.returnService.resolveReturn(returnId as string, resolution, agentNotes);
    
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
}
