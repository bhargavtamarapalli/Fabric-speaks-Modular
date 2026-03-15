import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from './config.service';
import { ConfigRepository } from '../repositories/config.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { Redis } from 'ioredis';

vi.mock('../repositories/config.repository');
vi.mock('../repositories/audit-log.repository');
vi.mock('ioredis');

describe('ConfigService', () => {
  let service: ConfigService;
  let repo: ConfigRepository;
  let auditLogRepo: AuditLogRepository;
  let redis: Redis;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ConfigRepository({} as any);
    auditLogRepo = new AuditLogRepository({} as any);
    redis = new Redis() as any;
    service = new ConfigService(repo, auditLogRepo, redis);
  });

  it('should update homepage config sections, log audit, and clear cache', async () => {
    const dto = { 
      sections: [{ type: 'announcement_bar' as const, isVisible: true, order: 1, data: { text: 'Hello' }, id: '1' }] 
    };
    
    await service.updateHomepageConfig(dto, 'admin-1');

    expect(repo.updateHomepageSection).toHaveBeenCalledWith('announcement_bar', true, { text: 'Hello' }, 'admin-1');
    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'homepage_update'
    }));
    expect(redis.del).toHaveBeenCalledWith('config:homepage');
  });

  it('should update navigation items, log audit, and clear cache', async () => {
    const dto = { links: [{ label: 'Home', href: '/' }] };
    
    await service.updateNavigationConfig(dto, 'admin-1');

    expect(repo.updateNavItems).toHaveBeenCalled();
    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'navigation_update'
    }));
    expect(redis.del).toHaveBeenCalledWith('config:navigation');
  });
});
