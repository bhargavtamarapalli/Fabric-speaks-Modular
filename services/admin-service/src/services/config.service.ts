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
    for (const section of data.sections) {
      let dbSection = section.type;
      // Map schema types to DB enum sections
      if (section.type === 'hero') dbSection = 'hero_banner' as any;
      if (section.type === 'banner') dbSection = 'hero_banner' as any; // Map to appropriate DB enum

      await this.repo.updateHomepageSection(dbSection, section.isVisible, section.data as any, adminId);
    }

    await this.auditLogRepo.insert({
      adminId,
      action: 'homepage_update',
      entityType: 'config',
      entityId: '00000000-0000-0000-0000-000000000000',
      afterJson: data as unknown as Record<string, unknown>
    });

    await this.redis.del('config:homepage');
    return { success: true };
  }

  async getHomepageConfig() {
    return this.repo.getHomepageConfig();
  }

  async updateNavigationConfig(data: UpdateNavigationConfigDto, adminId: string) {
    // Current admin uses UpdateNavDto (items[]), matching nav_items table
    // We'll support both for compatibility during transition
    const items = (data as any).items || (data as any).links;
    
    await this.repo.updateNavItems(items);

    await this.auditLogRepo.insert({
      adminId,
      action: 'navigation_update',
      entityType: 'config',
      entityId: '00000000-0000-0000-0000-000000000001',
      afterJson: data as unknown as Record<string, unknown>
    });

    await this.redis.del('config:navigation');
    return { success: true };
  }

  async getNavigationConfig() {
    return this.repo.getNavItems();
  }
}
