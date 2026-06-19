import { Request, Response } from 'express';
import { AppError, ErrorCode, catchAsync, getRedisClient } from '@fs/shared';
import { InventoryService } from '../services/inventory.service';
import {
  ManualAdjustmentSchema,
  ExpectedArrivalSchema,
  UpdateThresholdSchema,
  IdParamSchema,
  VariantIdParamSchema,
} from '../schemas/inventory.schemas';
import { INVENTORY_CONFIG } from '../config/inventory.config';

export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  /**
   * Critical #5: Distributed Redis-based rate limiting.
   * Replaces the previous in-memory Map which was broken across multiple server instances.
   * Uses atomic INCR + EXPIRE to safely track request counts per user across all pods.
   * Fail-open: if Redis is unavailable, the request is allowed through (logged).
   */
  private async checkRateLimitRedis(userId: string): Promise<void> {
    const key = `rate_limit:bulk_inventory:${userId}`;
    const { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS } = INVENTORY_CONFIG.BULK_UPLOAD;

    try {
      const redis = getRedisClient();
      const current = await redis.incr(key);

      // Only set expiry on the very first increment
      if (current === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
      }

      // High #5: Limit is now 20/min (was 5/min — too strict for bulk operations)
      if (current > RATE_LIMIT_MAX) {
        throw new AppError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          `Too many bulk inventory requests. Limit: ${RATE_LIMIT_MAX} per ${RATE_LIMIT_WINDOW_SECONDS}s. Please try again later.`
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // Fail-open: Redis unavailable — log and allow request
      console.error('[InventoryController] Rate limit Redis check failed, failing open:', (err as Error).message);
    }
  }

  listInventory = catchAsync(async (req: Request, res: Response) => {
    const { sort } = req.query;
    const sortBy = sort === 'desc' ? 'desc' : 'asc';
    const items = await this.inventoryService.listInventory(sortBy);

    res.status(200).json({
      success: true,
      data: items,
    });
  });

  manualAdjustment = catchAsync(async (req: Request, res: Response) => {
    const { variantId } = VariantIdParamSchema.parse(req.params);
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    const validated = ManualAdjustmentSchema.parse(req.body);

    // Medium #1: Server-side double-submit prevention via Idempotency-Key header
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    const result = await this.inventoryService.manualAdjustment(
      variantId,
      validated.newQty,
      validated.reason,
      adminUserId,
      idempotencyKey
    );

    res.status(200).json({
      success: true,
      data: result.variant,
      ...(result.warning ? { warning: result.warning } : {}),
    });
  });

  bulkAdjustment = catchAsync(async (req: Request, res: Response) => {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    // Critical #5: Distributed rate limiting via Redis
    await this.checkRateLimitRedis(adminUserId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = (req as any).file;
    if (!file || !file.buffer) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'CSV file is required');
    }

    // Critical #7: Use centralized config constant — synced with Multer limit in routes
    if (file.size > INVENTORY_CONFIG.BULK_UPLOAD.MAX_FILE_SIZE) {
      throw new AppError(
        ErrorCode.BULK_UPLOAD_LIMIT,
        `CSV file size exceeds ${INVENTORY_CONFIG.BULK_UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB limit`
      );
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const result = await this.inventoryService.bulkAdjustment(file.buffer, adminUserId, idempotencyKey);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  addExpectedArrival = catchAsync(async (req: Request, res: Response) => {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    const validated = ExpectedArrivalSchema.parse(req.body);

    const arrival = await this.inventoryService.addExpectedArrival(
      {
        variant_id: validated.variant_id,
        expected_qty: validated.expected_qty,
        expected_date: new Date(validated.expected_date),
        notes: validated.notes,
        created_by: adminUserId,
      },
      adminUserId
    );

    res.status(201).json({
      success: true,
      data: arrival,
    });
  });

  markArrivalReceived = catchAsync(async (req: Request, res: Response) => {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    const { id } = IdParamSchema.parse(req.params);
    await this.inventoryService.markArrivalReceived(id, adminUserId);

    res.status(200).json({
      success: true,
      message: 'Arrival marked as received successfully',
    });
  });

  updateThreshold = catchAsync(async (req: Request, res: Response) => {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    }

    const { variantId } = VariantIdParamSchema.parse(req.params);
    const validated = UpdateThresholdSchema.parse(req.body);

    await this.inventoryService.updateThreshold(variantId, validated.threshold_qty, adminUserId);

    res.status(200).json({
      success: true,
      message: 'Threshold updated successfully',
    });
  });

  getExpectedArrivals = catchAsync(async (req: Request, res: Response) => {
    const arrivals = await this.inventoryService.getExpectedArrivals();

    res.status(200).json({
      success: true,
      data: arrivals,
    });
  });

  getHealth = catchAsync(async (req: Request, res: Response) => {
    const health = await this.inventoryService.getHealth();

    res.status(200).json({
      success: true,
      data: health,
    });
  });

  getVelocity = catchAsync(async (req: Request, res: Response) => {
    const data = await this.inventoryService.getInventoryWithVelocity();

    res.status(200).json({
      success: true,
      data,
    });
  });

  getRestockSuggestions = catchAsync(async (req: Request, res: Response) => {
    const data = await this.inventoryService.getRestockSuggestions();

    res.status(200).json({
      success: true,
      data,
    });
  });

  getDeadStock = catchAsync(async (req: Request, res: Response) => {
    const days = req.query.days ? Number(req.query.days) : 30;
    if (Number.isNaN(days) || days <= 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'days must be a positive number');
    }

    const data = await this.inventoryService.getDeadStock(days);
    res.status(200).json({ success: true, data });
  });

  getDemandPatterns = catchAsync(async (req: Request, res: Response) => {
    const days = req.query.days ? Number(req.query.days) : 30;
    if (Number.isNaN(days) || days <= 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'days must be a positive number');
    }

    const data = await this.inventoryService.getDemandPatterns(days);
    res.status(200).json({ success: true, data });
  });
}
