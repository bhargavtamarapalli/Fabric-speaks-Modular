import { Request, Response } from 'express';
import { configService } from '../services/config.service';
import { UpdateHomepageConfigSchema, UpdateNavSchema } from '../schemas/nav.schemas';

export async function updateNavigationConfig(req: Request, res: Response): Promise<void> {
  const dto = UpdateNavSchema.parse(req.body);
  const result = await configService.updateNavigation(dto, req.user!.userId);
  res.json({ success: true, data: result });
}

export async function updateHomepageConfig(req: Request, res: Response): Promise<void> {
  const dto = UpdateHomepageConfigSchema.parse(req.body);
  const result = await configService.updateHomepage(dto, req.user!.userId);
  res.json({ success: true, data: result });
}
