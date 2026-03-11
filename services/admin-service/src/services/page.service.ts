import { pageRepository } from '../repositories/page.repository';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { CreatePageDto, PageListQueryDto, UpdatePageDto } from '../schemas/page.schemas';

export class PageService {
  async listPages(filters: PageListQueryDto) {
    return pageRepository.list(filters);
  }

  async createPage(data: CreatePageDto, adminId: string) {
    const page = await pageRepository.create(data);

    await auditLogRepository.insert({
      adminId,
      action: 'page_create',
      targetType: 'content_page',
      targetId: page.id,
      payload: { title: data.title, slug: page.slug }
    });

    return page;
  }

  async updatePage(id: string, data: UpdatePageDto, adminId: string) {
    const updated = await pageRepository.update(id, data);
    if (!updated) {
       throw new AppError(ErrorCode.NOT_FOUND, 'Page not found');
    }

    await auditLogRepository.insert({
      adminId,
      action: 'page_update',
      targetType: 'content_page',
      targetId: id,
      payload: { updatedKeys: Object.keys(data) }
    });

    return updated;
  }
}

export const pageService = new PageService();
