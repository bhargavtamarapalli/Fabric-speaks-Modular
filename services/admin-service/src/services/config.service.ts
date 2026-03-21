import { ConfigRepository } from '../repositories/config.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { Redis } from 'ioredis';
import { UpdateHomepageConfigDto, UpdateNavigationConfigDto } from '../schemas/nav.schemas';
import { AppError, ErrorCode } from '@fs/shared';

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

  async getHomepageConfigPublic() {
    const sections = await this.repo.getHomepageConfig();
    const now = new Date();

    return sections.filter((section) => {
      if (!section.is_active) return false;
      const config = section.config_json ?? section.configJson ?? {};
      const startsAt = config.startsAt ? new Date(config.startsAt) : null;
      const endsAt = config.endsAt ? new Date(config.endsAt) : null;
      if (startsAt && now < startsAt) return false;
      if (endsAt && now > endsAt) return false;
      return true;
    });
  }

  async updateNavigationConfig(data: UpdateNavigationConfigDto, adminId: string) {
    const items = this.normalizeNavigationItems(data);
    
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

  private normalizeNavigationItems(data: UpdateNavigationConfigDto) {
    if ('items' in data) {
      return data.items;
    }

    const hasNestedChildren = data.links.some(link => (link.children?.length ?? 0) > 0);
    if (hasNestedChildren) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Nested navigation children are not supported by the current nav_items persistence model'
      );
    }

    return data.links.map((link, index) => ({
      label: link.label,
      type: 'url' as const,
      targetSlug: link.href,
      displayOrder: index,
      highlightColor: null,
      parentId: null
    }));
  }
}
