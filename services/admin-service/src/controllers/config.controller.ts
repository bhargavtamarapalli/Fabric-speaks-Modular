import { Request, Response } from 'express';
import { ConfigService } from '../services/config.service';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';
import { UpdateHomepageConfigSchema, UpdateNavigationConfigSchema } from '../schemas/nav.schemas';

export class ConfigController {
  constructor(private configService: ConfigService) {}

  updateHomepageConfig = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const dto = UpdateHomepageConfigSchema.parse(req.body);
    const result = await this.configService.updateHomepageConfig(dto, adminId);
    res.json({ success: true, data: result });
  });

  updateNavigationConfig = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const dto = UpdateNavigationConfigSchema.parse(req.body);
    const result = await this.configService.updateNavigationConfig(dto, adminId);
    res.json({ success: true, data: result });
  });

  getHomepageConfig = catchAsync(async (req: Request, res: Response) => {
    const result = await this.configService.getHomepageConfig();
    res.json({ success: true, data: result });
  });

  getNavigationConfig = catchAsync(async (req: Request, res: Response) => {
    const result = await this.configService.getNavigationConfig();
    res.json({ success: true, data: result });
  });
}
