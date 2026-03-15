import { ConfigRepository } from '../repositories/config.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { Redis } from 'ioredis';
import { UpdateHomepageConfigDto, UpdateNavigationConfigDto } from '../schemas/nav.schemas';

export class ConfigService {
  constructor(
    private repo: ConfigRepository,
    private auditLogRepo: AuditLogRepository,
    private redis: Redis
  ) {}

  async updateHomepageConfig(data: UpdateHomepageConfigDto, adminId: string) {
    await this.repo.updateConfig('homepage', data);

    await this.auditLogRepo.insert({
      adminId,
      action: 'homepage_update',
      entityType: 'config',
      entityId: '00000000-0000-0000-0000-000000000000', // Mock UUID for global config
      afterJson: data as unknown as Record<string, unknown>
    });

    await this.redis.del('config:homepage');
    return { success: true };
  }

  async updateNavigationConfig(data: UpdateNavigationConfigDto, adminId: string) {
    await this.repo.updateConfig('navigation', data);

    await this.auditLogRepo.insert({
      adminId,
      action: 'navigation_update',
      entityType: 'config',
      entityId: '00000000-0000-0000-0000-000000000001', // Mock UUID for nav config
      afterJson: data as unknown as Record<string, unknown>
    });

    await this.redis.del('config:navigation');
    return { success: true };
  }
}
