import { Request, Response } from 'express';
import { BannerService } from '../services/banner.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';
import { BannerSchema, UpdateBannerSchema, BannerListQuerySchema } from '../schemas/content.schemas';
import { IdParamSchema } from '../schemas/admin.schemas';

export class BannerController {
  constructor(private bannerService: BannerService) {}

  listBanners = catchAsync(async (req: Request, res: Response) => {
    const filters = BannerListQuerySchema.parse(req.query);
    const banners = await this.bannerService.listBanners(filters);
    res.json({ success: true, data: banners });
  });

  createBanner = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    if (!adminId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const dto = BannerSchema.parse(req.body);
    const banner = await this.bannerService.createBanner({
      ...dto,
      starts_at: new Date(dto.starts_at),
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
      created_by: adminId
    }, adminId);

    res.status(201).json({ success: true, data: banner });
  });

  updateBanner = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const adminId = req.user?.userId;
    if (!adminId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const dto = UpdateBannerSchema.parse(req.body);
    const updated = await this.bannerService.updateBanner(id, {
      ...dto,
      starts_at: dto.starts_at ? new Date(dto.starts_at) : undefined,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined
    }, adminId);

    res.json({ success: true, data: updated });
  });

  deleteBanner = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const adminId = req.user?.userId;
    if (!adminId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    await this.bannerService.deleteBanner(id, adminId);
    res.json({ success: true, data: { deleted: true } });
  });
}
