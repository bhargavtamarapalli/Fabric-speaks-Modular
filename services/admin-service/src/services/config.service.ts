import { configRepository } from '../repositories/config.repository';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { UpdateHomepageConfigDto, UpdateNavDto } from '../schemas/nav.schemas';

export class ConfigService {
  async updateNavigation(data: UpdateNavDto, adminId: string) {
    const updatedCount = await configRepository.updateNav(data);

    await auditLogRepository.insert({
      adminId,
      action: 'navigation_update',
      targetType: 'config',
      targetId: 'nav:global',
      payload: { itemsCount: data.items.length }
    });

    return { updatedCount };
  }

  async updateHomepage(data: UpdateHomepageConfigDto, adminId: string) {
    await configRepository.updateHomepage(data);

    await auditLogRepository.insert({
      adminId,
      action: 'homepage_update',
      targetType: 'config',
      targetId: 'homepage:config',
      payload: { keysUpdated: Object.keys(data) }
    });

    return { updated: true, previewUrl: 'https://preview.fabricspeaks.com?preview=1' }; // Mock URL for assignment
  }
}

export const configService = new ConfigService();
