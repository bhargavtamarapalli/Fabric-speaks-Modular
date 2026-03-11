import { Request, Response } from 'express';
import { pageService } from '../services/page.service';
import { 
  CreatePageSchema, 
  PageListQuerySchema, 
  UpdatePageSchema 
} from '../schemas/page.schemas';

export async function listPages(req: Request, res: Response): Promise<void> {
  const filters = PageListQuerySchema.parse(req.query);
  const result = await pageService.listPages(filters);
  res.json({ success: true, data: { items: result.items }, meta: result.meta });
}

export async function createPage(req: Request, res: Response): Promise<void> {
  const dto = CreatePageSchema.parse(req.body);
  const result = await pageService.createPage(dto, req.user!.userId);
  res.status(201).json({ success: true, data: result });
}

export async function updatePage(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const dto = UpdatePageSchema.parse(req.body);
  const result = await pageService.updatePage(id, dto, req.user!.userId);
  res.json({ success: true, data: result });
}
