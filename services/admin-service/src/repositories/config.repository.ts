import { BaseRepository } from '@fs/shared';

export class ConfigRepository extends BaseRepository {
    async updateHomepageSection(section: string, isActive: boolean, config: Record<string, unknown>, adminUserId: string): Promise<void> {
        const query = `
            INSERT INTO homepage_config (section, is_active, config_json, updated_by)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (section) DO UPDATE SET 
                is_active = EXCLUDED.is_active,
                config_json = EXCLUDED.config_json,
                updated_by = EXCLUDED.updated_by,
                updated_at = now()
        `;
        await this.query(query, [section, isActive, config, adminUserId]);
    }

    async getHomepageConfig(): Promise<any[]> {
        const { rows } = await this.query('SELECT * FROM homepage_config ORDER BY display_order ASC');
        return rows;
    }

    async getHomepageSection(section: string): Promise<any | null> {
        const { rows } = await this.query('SELECT * FROM homepage_config WHERE section = $1', [section]);
        return rows[0] || null;
    }

    async updateNavItems(items: any[]): Promise<void> {
        await this.withTransaction(async (client) => {
            await client.query('DELETE FROM nav_items');

            for (const item of items) {
                await client.query(`
                    INSERT INTO nav_items (
                        label,
                        link_type,
                        link_target,
                        display_order,
                        is_active,
                        highlight_color,
                        parent_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    item.label,
                    item.type,
                    item.targetSlug,
                    item.displayOrder,
                    true,
                    item.highlightColor ?? null,
                    item.parentId ?? null
                ]);
            }
        });
    }

    async getNavItems(): Promise<any[]> {
        const { rows } = await this.query('SELECT * FROM nav_items ORDER BY display_order ASC');
        return rows;
    }
}
