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

  it('should update homepage config, log audit, and clear cache', async () => {
    const dto = { sections: [] };
    
    await service.updateHomepageConfig(dto, 'admin-1');

    expect(repo.updateConfig).toHaveBeenCalledWith('homepage', dto);
    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'homepage_update'
    }));
    expect(redis.del).toHaveBeenCalledWith('config:homepage');
  });

  it('should update navigation config, log audit, and clear cache', async () => {
    const dto = { links: [] };
    
    await service.updateNavigationConfig(dto, 'admin-1');

    expect(repo.updateConfig).toHaveBeenCalledWith('navigation', dto);
    expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'navigation_update'
    }));
    expect(redis.del).toHaveBeenCalledWith('config:navigation');
  });
});
