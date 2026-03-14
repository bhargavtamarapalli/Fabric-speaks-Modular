import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';

export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  listInventory = catchAsync(async (req: Request, res: Response) => {
    const { sort } = req.query;
    const sortBy = sort === 'desc' ? 'desc' : 'asc';
    const items = await this.inventoryService.listInventory(sortBy);
    
    res.status(200).json({
      success: true,
      data: items
    });
  });

  manualAdjustment = catchAsync(async (req: Request, res: Response) => {
    const { variantId } = req.params;
    const { newQty, reason } = req.body;
    const adminUserId = req.user!.userId;

    const updated = await this.inventoryService.manualAdjustment(variantId!, newQty, reason, adminUserId);
    
    res.status(200).json({
      success: true,
      data: updated
    });
  });

  bulkAdjustment = catchAsync(async (req: Request, res: Response) => {
    const adminUserId = req.user!.userId;
    const file = (req as any).file;
    if (!file || !file.buffer) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'CSV file is required');
    }

    const result = await this.inventoryService.bulkAdjustment(file.buffer, adminUserId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });

  addExpectedArrival = catchAsync(async (req: Request, res: Response) => {
    const { variantId, expectedQty, arrivalDate } = req.body;
    const adminUserId = req.user!.userId;

    const arrival = await this.inventoryService.addExpectedArrival({
      variant_id: variantId,
      expected_qty: expectedQty,
      arrival_date: new Date(arrivalDate)
    }, adminUserId);
    
    res.status(201).json({
      success: true,
      data: arrival
    });
  });

  getExpectedArrivals = catchAsync(async (req: Request, res: Response) => {
    const arrivals = await this.inventoryService.getExpectedArrivals();
    
    res.status(200).json({
      success: true,
      data: arrivals
    });
  });

  getHealth = catchAsync(async (req: Request, res: Response) => {
    const health = await this.inventoryService.getStockHealth();
    
    res.status(200).json({
      success: true,
      data: health
    });
  });
}
