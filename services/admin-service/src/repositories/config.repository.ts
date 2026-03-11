import { query } from '@fs/shared/db';
import redisClient from '@fs/shared/redis';
import { UpdateHomepageConfigDto, UpdateNavDto } from '../schemas/nav.schemas';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handles Site Configuration logic.
 * For global configs, we store truth in `dynamic_configs` Postgres table and cache in Redis indefinitely (cleared on save).
 */
export class ConfigRepository {
  
  async updateNav(data: UpdateNavDto): Promise<number> {
    // 1. Transaction to replace nav items.
    await query('BEGIN', []);
    try {
      await query('DELETE FROM nav_items', []);

      for (const item of data.items) {
        await query(
          `INSERT INTO nav_items (id, label, item_type, target_slug, display_order, highlight_color) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.id || uuidv4(),
            item.label,
            item.type,
            item.targetSlug,
            item.displayOrder,
            item.highlightColor || null
          ]
        );
      }
      
      await query('COMMIT', []);
      
      // 2. Invalidate Global Nav Redis Cache
      await redisClient.del('nav:global');
      
      return data.items.length;
    } catch (e) {
      await query('ROLLBACK', []);
      throw e;
    }
  }

  async updateHomepage(data: UpdateHomepageConfigDto): Promise<void> {
    // Upsert full JSON config into dynamic_configs
    await query(
      `INSERT INTO dynamic_configs (key, value)
       VALUES ('homepage:config', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(data)]
    );

    // Invalidate Cache
    await redisClient.del('homepage:config');
  }
}

export const configRepository = new ConfigRepository();
