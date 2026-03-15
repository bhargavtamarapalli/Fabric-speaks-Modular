import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { UpdateSettingSchema } from '../schemas/admin.schemas';
import { catchAsync } from '@fs/shared';

export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  getAllSettings = catchAsync(async (req: Request, res: Response) => {
    const settings = await this.settingsService.getAllSettings();
    res.status(200).json({ success: true, data: settings });
  });

  getPublicSettings = catchAsync(async (req: Request, res: Response) => {
    const settings = await this.settingsService.getPublicSettings();
    res.status(200).json({ success: true, data: settings });
  });

  updateSetting = catchAsync(async (req: Request, res: Response) => {
    const payload = UpdateSettingSchema.parse(req.body);
    const adminId = req.user!.userId;
    
    await this.settingsService.updateSetting(payload.key, payload.value, adminId);
    
    res.status(200).json({ 
      success: true, 
      data: { key: payload.key, value: payload.value } 
    });
  });
}
