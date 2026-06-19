import { getDbPool, logger } from '@fs/shared';

export async function runMigrations() {
  const pool = getDbPool();

  try {
    const query = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'homepage_section') THEN
          CREATE TYPE homepage_section AS ENUM (
            'announcement_bar',
            'hero_banner',
            'shop_by_fabric',
            'new_arrivals',
            'featured_collection',
            'brand_spotlight',
            'fabric_story',
            'deal_of_day'
          );
        END IF;
      END
      $$;

      CREATE TABLE IF NOT EXISTS homepage_config (
        id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
        section       homepage_section  UNIQUE NOT NULL,
        is_active     BOOLEAN           NOT NULL DEFAULT false,
        config_json   JSONB             NOT NULL DEFAULT '{}',
        display_order SMALLINT          NOT NULL DEFAULT 0,
        updated_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
        updated_by    UUID              REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS homepage_config_json_gin
        ON homepage_config USING GIN(config_json);
    `;

    await pool.query(query);
    logger.info('✅ Successfully executed database migrations for Admin Service (homepage_config)');
  } catch (error) {
    logger.error('❌ Error executing migrations (Admin Service):', error);
    throw error;
  }
}
