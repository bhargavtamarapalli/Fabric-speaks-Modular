import { ConfigRepository } from '../repositories/config.repository';

import { AuditLogRepository } from '../repositories/audit-log.repository';
import { Redis } from 'ioredis';

export class ConfigService {
  constructor(
    private repo: ConfigRepository,
    private auditLogRepo: AuditLogRepository,
    private redis: Redis
  ) {}

  async updateHomepageConfig(data: any, adminId: string) {
    await this.repo.updateConfig('homepage', data);

    await this.auditLogRepo.insert({
      adminId,
      action: 'homepage_update',
      entityType: 'config',
      entityId: 'homepage',
      afterJson: data
    });

    await this.redis.del('config:homepage');
    return { success: true };
  }

  async updateNavigationConfig(data: any, adminId: string) {
    await this.repo.updateConfig('navigation', data);

    await this.auditLogRepo.insert({
      adminId,
      action: 'navigation_update',
      entityType: 'config',
      entityId: 'navigation',
      afterJson: data
    });

    await this.redis.del('config:navigation');
    return { success: true };
  }
}
