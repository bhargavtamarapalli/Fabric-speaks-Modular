import { Request, Response, NextFunction } from 'express';
import { ReturnService } from '../services/return.service';
import { AppError, ErrorCode } from '@fs/shared';

const returnService = new ReturnService();

export class ReturnController {
  
  static async initiateReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.userId; // Assumes requireAuth is used
      
      if (!userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

      const newReturn = await returnService.initiateReturn(orderId as string, userId, reason);
      
      res.status(201).json({ success: true, data: newReturn });
    } catch (error) {
      next(error);
    }
  }

  static async getReturnStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { returnId } = req.params;
      const ret = await returnService.getReturnStatus(returnId as string);
      
      // Basic ACL: ensure customer can only see their own return
      const isCustomer = req.user?.role === 'CUSTOMER' as any;
      if (isCustomer && ret.user_id !== req.user?.userId) {
         throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Forbidden');
      }

      res.status(200).json({ success: true, data: ret });
    } catch (error) {
      next(error);
    }
  }

  static async listReturns(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const returns = await returnService.listReturns(status as any);
      
      res.status(200).json({ success: true, data: returns });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { returnId } = req.params;
      const { status } = req.body;
      
      const updated = await returnService.updateStatus(returnId as string, status);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async scheduleShiprocketPickup(req: Request, res: Response, next: NextFunction) {
    try {
      const { returnId } = req.params;
      
      const updated = await returnService.scheduleShiprocketPickup(returnId as string);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async resolveReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const { returnId } = req.params;
      const { resolution } = req.body; // 'REFUND' or 'REPLACEMENT'
      
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid resolution type. Must be REFUND or REPLACEMENT');

      const updated = await returnService.resolveReturn(returnId as string, resolution);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
