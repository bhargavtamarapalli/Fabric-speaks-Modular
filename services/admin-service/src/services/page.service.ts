import { PageRepository, AdminPage } from '../repositories/page.repository';
import { AppError, ErrorCode } from '@fs/shared';
import { CreatePageDto, PageListQueryDto, UpdatePageDto } from '../schemas/page.schemas';

import { AuditLogRepository } from '../repositories/audit-log.repository';

export class PageService {
  constructor(
    private repo: PageRepository,
    private auditLogRepo: AuditLogRepository
  ) {}

  async listPages(filters: PageListQueryDto) {
    return this.repo.list(filters);
  }

  async createPage(data: CreatePageDto, adminId: string) {
    const page = await this.repo.create(data);

    await this.auditLogRepo.insert({
      adminId,
      action: 'page_create',
      entityType: 'page',
      entityId: page.id,
      afterJson: page as unknown as Record<string, unknown>
    });

    return page;
  }

  async updatePage(id: string, data: UpdatePageDto, adminId: string) {
    const before = await this.repo.findById(id);
    if (!before) throw new AppError(ErrorCode.NOT_FOUND, 'Page not found');

    const updated = await this.repo.update(id, data);
    if (!updated) {
       throw new AppError(ErrorCode.NOT_FOUND, 'Page not found');
    }

    await this.auditLogRepo.insert({
      adminId,
      action: 'page_update',
      entityType: 'page',
      entityId: id,
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: updated as unknown as Record<string, unknown>
    });

    return updated;
  }
}
