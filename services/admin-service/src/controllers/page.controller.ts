import { Request, Response } from 'express';
import { PageService } from '../services/page.service';
import { 
  PageListQuerySchema, 
  CreatePageSchema, 
  UpdatePageSchema 
} from '../schemas/page.schemas';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';

export class PageController {
  constructor(private pageService: PageService) {}

  listPages = catchAsync(async (req: Request, res: Response) => {
    const filters = PageListQuerySchema.parse(req.query);
    const result = await this.pageService.listPages(filters);
    res.json({ success: true, data: { items: result.items }, meta: result.meta });
  });

  createPage = catchAsync(async (req: Request, res: Response) => {
    const dto = CreatePageSchema.parse(req.body);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.pageService.createPage(dto, adminId);
    res.status(201).json({ success: true, data: result });
  });

  updatePage = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto = UpdatePageSchema.parse(req.body);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.pageService.updatePage(id!, dto, adminId);
    res.json({ success: true, data: result });
  });
}
