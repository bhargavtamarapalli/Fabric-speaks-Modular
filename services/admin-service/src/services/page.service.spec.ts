import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageService } from './page.service';
import { PageRepository } from '../repositories/page.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';

vi.mock('../repositories/page.repository');
vi.mock('../repositories/audit-log.repository');

describe('PageService', () => {
  let service: PageService;
  let repo: PageRepository;
  let auditLogRepo: AuditLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PageRepository({} as any);
    auditLogRepo = new AuditLogRepository({} as any);
    service = new PageService(repo, auditLogRepo);
  });

  it('should create a page and log audit', async () => {
    const dto = { title: 'About', content: '<p>Hi</p>' };
    const mockPage = { id: 'p1', ...dto, slug: 'about', isActive: true, createdAt: new Date(), updatedAt: new Date() };
    
    vi.mocked(repo.create).mockResolvedValue(mockPage);

    const result = await service.createPage(dto as any, 'admin-1');

    expect(result).toEqual(mockPage);
    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'page_create',
      entityType: 'page'
    }));
  });

  it('should update a page and log audit', async () => {
    const mockOld = { id: 'p1', title: 'Old' };
    vi.mocked(repo.findById).mockResolvedValue(mockOld as any);
    vi.mocked(repo.update).mockResolvedValue({ id: 'p1', title: 'New' } as any);

    await service.updatePage('p1', { title: 'New' }, 'admin-1');

    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'page_update',
      entityId: 'p1'
    }));
  });
});
