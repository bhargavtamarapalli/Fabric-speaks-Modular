import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service';

export class ConfigController {
  constructor(private configService: ConfigService) {}

  updateHomepageConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.configService.updateHomepageConfig(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  updateNavigationConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.configService.updateNavigationConfig(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
