import { PageRepository, AdminPage } from '../repositories/page.repository';
import { AppError, ErrorCode } from '@fs/shared';
import { CreatePageDto, PageListQueryDto, UpdatePageDto } from '../schemas/page.schemas';

export class PageService {
  constructor(private repo: PageRepository) {}

  async listPages(filters: PageListQueryDto) {
    return this.repo.list(filters);
  }

  async createPage(data: CreatePageDto, adminId: string) {
    const page = await this.repo.create(data);
    return page;
  }

  async updatePage(id: string, data: UpdatePageDto, adminId: string) {
    const updated = await this.repo.update(id, data);
    if (!updated) {
       throw new AppError(ErrorCode.NOT_FOUND, 'Page not found');
    }
    return updated;
  }
}
