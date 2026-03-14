import { Request, Response, NextFunction } from 'express';
import { PageService } from '../services/page.service';
import { 
  PageListQuerySchema, 
  CreatePageSchema, 
  UpdatePageSchema 
} from '../schemas/page.schemas';
import { AppError, ErrorCode } from '@fs/shared';

export class PageController {
  constructor(private pageService: PageService) {}

  listPages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = PageListQuerySchema.parse(req.query);
      const result = await this.pageService.listPages(filters);
      res.json({ success: true, data: { items: result.items }, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  createPage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = CreatePageSchema.parse(req.body);
      const adminUserId = req.user?.userId;
      if (!adminUserId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

      const result = await this.pageService.createPage(dto, adminUserId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  updatePage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dto = UpdatePageSchema.parse(req.body);
      const adminUserId = req.user?.userId;
      if (!adminUserId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

      const result = await this.pageService.updatePage(id, dto, adminUserId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
