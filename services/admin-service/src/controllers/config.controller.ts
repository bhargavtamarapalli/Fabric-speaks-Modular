import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service';

export class ConfigController {
  constructor(private configService: ConfigService) {}

  updateHomepageConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = req.user?.userId;
      if (!adminUserId) throw new Error('Unauthorized');

      const result = await this.configService.updateHomepageConfig(req.body, adminUserId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  updateNavigationConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = req.user?.userId;
      if (!adminUserId) throw new Error('Unauthorized');

      const result = await this.configService.updateNavigationConfig(req.body, adminUserId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
