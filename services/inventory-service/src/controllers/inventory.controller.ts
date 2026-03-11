import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AppError, ErrorCode } from '@fs/shared';

const inventoryService = new InventoryService();

export class InventoryController {
  
  static async listInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const { sort } = req.query;
      const sortBy = sort === 'desc' ? 'desc' : 'asc';
      const items = await inventoryService.listInventory(sortBy);
      
      res.status(200).json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  }

  static async manualAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = req.params;
      const { newQty, reason } = req.body;
      const adminUserId = req.user?.id; // Assuming requireAuth middleware sets req.user

      if (!adminUserId) {
         throw new AppError('Unauthorized', 401, ErrorCode.UNAUTHORIZED);
      }

      const updated = await inventoryService.manualAdjustment(variantId, newQty, reason, adminUserId);
      
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        throw new AppError('Unauthorized', 401, ErrorCode.UNAUTHORIZED);
      }

      if (!req.file || !req.file.buffer) {
        throw new AppError('CSV file is required', 400, ErrorCode.VALIDATION_ERROR);
      }

      const result = await inventoryService.bulkAdjustment(req.file.buffer, adminUserId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async addExpectedArrival(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId, expectedQty, arrivalDate } = req.body;
      
      if (!variantId || !expectedQty || !arrivalDate) {
        throw new AppError('Missing required fields', 400, ErrorCode.VALIDATION_ERROR);
      }

      const arrival = await inventoryService.addExpectedArrival({
        variant_id: variantId,
        expected_qty: expectedQty,
        arrival_date: new Date(arrivalDate)
      });
      
      res.status(201).json({
        success: true,
        data: arrival
      });
    } catch (error) {
      next(error);
    }
  }

  static async getExpectedArrivals(req: Request, res: Response, next: NextFunction) {
    try {
      const arrivals = await inventoryService.getExpectedArrivals();
      
      res.status(200).json({
        success: true,
        data: arrivals
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await inventoryService.getStockHealth();
      
      res.status(200).json({
        success: true,
        data: health
      });
    } catch (error) {
      next(error);
    }
  }
}
