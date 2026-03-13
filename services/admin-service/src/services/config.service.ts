import { ConfigRepository } from '../repositories/config.repository';

export class ConfigService {
  constructor(private repo: ConfigRepository) {}

  async updateHomepageConfig(data: any) {
    await this.repo.updateConfig('homepage', data);
    return { success: true };
  }

  async updateNavigationConfig(data: any) {
    await this.repo.updateConfig('navigation', data);
    return { success: true };
  }
}
