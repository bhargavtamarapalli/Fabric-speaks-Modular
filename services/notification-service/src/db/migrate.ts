import { getDbPool, logger } from '@fs/shared';

export async function runMigrations() {
  const pool = getDbPool();
  
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS notification_logs (
        id UUID PRIMARY KEY,
        user_id UUID,
        order_id UUID,
        event_type VARCHAR(100) NOT NULL,
        recipient VARCHAR(100) NOT NULL,
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        provider_response JSONB,
        template_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_notif_logs_user ON notification_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_notif_logs_order ON notification_logs(order_id);
      CREATE INDEX IF NOT EXISTS idx_notif_logs_status ON notification_logs(status);
    `;
    
    await pool.query(query);
    logger.info('✅ Successfully executed database migrations for notification_logs');
  } catch (error) {
    logger.error('❌ Error executing migrations:', error);
    throw error;
  }
}
