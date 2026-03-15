import { Request, Response } from 'express';
import { SaleEventService } from '../services/sale-event.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';
import { SaleEventSchema, UpdateSaleEventSchema } from '../schemas/content.schemas';
import { IdParamSchema } from '../schemas/admin.schemas';
import { z } from 'zod';

export class SaleEventController {
  constructor(private saleEventService: SaleEventService) {}

  listSaleEvents = catchAsync(async (req: Request, res: Response) => {
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const saleEvents = await this.saleEventService.listSaleEvents({ isActive, limit, offset });
    res.json({ success: true, data: saleEvents });
  });

  createSaleEvent = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    if (!adminId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const dto = SaleEventSchema.parse(req.body);
    const saleEvent = await this.saleEventService.createSaleEvent({
      ...dto,
      starts_at: new Date(dto.starts_at),
      ends_at: new Date(dto.ends_at),
      created_by: adminId
    }, adminId);

    res.status(201).json({ success: true, data: saleEvent });
  });

  updateSaleEvent = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const adminId = req.user?.userId;
    if (!adminId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const dto = UpdateSaleEventSchema.parse(req.body);
    const updated = await this.saleEventService.updateSaleEvent(id, {
      ...dto,
      starts_at: dto.starts_at ? new Date(dto.starts_at) : undefined,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined
    }, adminId);

    res.json({ success: true, data: updated });
  });

  deleteSaleEvent = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const adminId = req.user?.userId;
    if (!adminId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    await this.saleEventService.deleteSaleEvent(id, adminId);
    res.json({ success: true, data: { deleted: true } });
  });
}
