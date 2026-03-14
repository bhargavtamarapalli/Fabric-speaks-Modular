import { Request, Response } from 'express';
import { ReturnService } from '../services/return.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';

export class ReturnController {
  constructor(private returnService: ReturnService) {}
  
  initiateReturn = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const newReturn = await this.returnService.initiateReturn(orderId as string, userId, reason);
    
    res.status(201).json({ success: true, data: newReturn });
  });

  getReturnStatus = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = req.params;
    const ret = await this.returnService.getReturnStatus(returnId as string);
    
    const isCustomer = (req.user?.role as string) === 'CUSTOMER';
    if (isCustomer && ret.userId !== req.user?.userId) {
       throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Forbidden');
    }

    res.status(200).json({ success: true, data: ret });
  });

  listReturns = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.query;
    const returns = await this.returnService.listReturns(status as any);
    
    res.status(200).json({ success: true, data: returns });
  });

  updateStatus = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = req.params;
    const { status } = req.body;
    
    const updated = await this.returnService.updateStatus(returnId as string, status);
    res.status(200).json({ success: true, data: updated });
  });

  scheduleShiprocketPickup = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = req.params;
    
    const updated = await this.returnService.scheduleShiprocketPickup(returnId as string);
    res.status(200).json({ success: true, data: updated });
  });

  resolveReturn = catchAsync(async (req: Request, res: Response) => {
    const { returnId } = req.params;
    const { resolution } = req.body; // 'REFUND' or 'REPLACEMENT'
    
    if (resolution !== 'REFUND' && resolution !== 'REPLACEMENT') {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid resolution type. Must be REFUND or REPLACEMENT');
    }

    const updated = await this.returnService.resolveReturn(returnId as string, resolution);
    res.status(200).json({ success: true, data: updated });
  });
}
