import { BaseRepository } from '@fs/shared';

export class ConfigRepository extends BaseRepository {
    async updateConfig(key: string, value: Record<string, unknown>): Promise<void> {
        const query = `
            INSERT INTO site_configs (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `;
        await this.query(query, [key, value]);
    }

    async getConfig<T>(key: string): Promise<T | null> {
        const { rows } = await this.query('SELECT value FROM site_configs WHERE key = $1', [key]);
        return (rows[0]?.value as T) || null;
    }
}
