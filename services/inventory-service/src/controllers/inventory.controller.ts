import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';
import { ManualAdjustmentSchema, ExpectedArrivalSchema } from '../schemas/inventory.schemas';

export class InventoryController {
  constructor(private inventoryService: InventoryService) { }

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
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    const validated = ManualAdjustmentSchema.parse(req.body);

    const updated = await this.inventoryService.manualAdjustment(
      variantId!,
      validated.newQty,
      validated.reason,
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: updated
    });
  });

  bulkAdjustment = catchAsync(async (req: Request, res: Response) => {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

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
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    const validated = ExpectedArrivalSchema.parse(req.body);

    const arrival = await this.inventoryService.addExpectedArrival({
      variant_id: validated.variant_id,
      expected_qty: validated.expected_qty,
      expected_date: new Date(validated.expected_date),
      notes: validated.notes,
      created_by: adminUserId
    }, adminUserId);

    res.status(201).json({
      success: true,
      data: arrival
    });
  });

  markArrivalReceived = catchAsync(async (req: Request, res: Response) => {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    const { id } = req.params;
    if (!id) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Arrival ID is required');
    }

    await this.inventoryService.markArrivalReceived(id, adminUserId);

    res.status(200).json({
      success: true,
      message: 'Arrival marked as received successfully'
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
