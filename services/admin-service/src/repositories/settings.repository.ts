import { BaseRepository } from '@fs/shared';

export interface StoreSetting {
  setting_key: string;
  setting_value: string;
  updated_by: string | null;
  updated_at: Date;
  created_at: Date;
}

export class SettingsRepository extends BaseRepository {
  
  async getAll(): Promise<Record<string, string>> {
    const res = await this.query('SELECT setting_key, setting_value FROM store_settings');
    const settings: Record<string, string> = {};
    for (const row of res.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  async getByKey(key: string): Promise<string | null> {
    const res = await this.query('SELECT setting_value FROM store_settings WHERE setting_key = $1', [key]);
    return res.rows[0] ? res.rows[0].setting_value : null;
  }

  async getMultiple(keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) return {};
    
    // Create parameterized list $1, $2, etc.
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const res = await this.query(`SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN (${placeholders})`, keys);
    
    const settings: Record<string, string> = {};
    for (const row of res.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  async upsert(key: string, value: string, adminId: string): Promise<StoreSetting> {
    const res = await this.query(`
      INSERT INTO store_settings (setting_key, setting_value, updated_by, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (setting_key) DO UPDATE 
      SET setting_value = EXCLUDED.setting_value, 
          updated_by = EXCLUDED.updated_by, 
          updated_at = NOW()
      RETURNING *
    `, [key, value, adminId]);
    
    return this.mapToCamelCase<StoreSetting>(res.rows[0]);
  }
}
