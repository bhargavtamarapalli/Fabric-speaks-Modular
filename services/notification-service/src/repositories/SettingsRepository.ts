import { BaseRepository } from '@fs/shared';

export class SettingsRepository extends BaseRepository {
  async getMultiple(keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) return {};

    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    const { rows } = await this.query(
      `SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN (${placeholders})`,
      keys
    );

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }
}
