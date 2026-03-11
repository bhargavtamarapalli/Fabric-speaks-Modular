import { getDbPool, logger } from '@fs/shared';

export async function runMigrations() {
  const pool = getDbPool();
  
  try {
    const query = `
      CREATE TYPE return_status_enum AS ENUM (
        'REQUESTED', 
        'APPROVED', 
        'PICKUP_SCHEDULED', 
        'RECEIVED', 
        'RESOLVED_REFUNDED', 
        'RESOLVED_REPLACED', 
        'REJECTED'
      );

      CREATE TABLE IF NOT EXISTS returns (
        id UUID PRIMARY KEY,
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        status return_status_enum DEFAULT 'REQUESTED',
        reason TEXT NOT NULL,
        pickup_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_returns_user ON returns(user_id);
      CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
    `;
    
    // Using a separate try/catch for the ENUM creation as it might already exist
    try {
        await pool.query(query);
    } catch (e: any) {
        if (e.code === '42710') { // duplicate_object
            logger.info('Enum already exists, creating table directly');
            const tableQuery = `
              CREATE TABLE IF NOT EXISTS returns (
                id UUID PRIMARY KEY,
                order_id UUID NOT NULL,
                user_id UUID NOT NULL,
                status return_status_enum DEFAULT 'REQUESTED',
                reason TEXT NOT NULL,
                pickup_date DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );

              CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
              CREATE INDEX IF NOT EXISTS idx_returns_user ON returns(user_id);
              CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
            `;
            await pool.query(tableQuery);
        } else {
            throw e;
        }
    }
    
    logger.info('✅ Successfully executed database migrations for Return Service');
  } catch (error) {
    logger.error('❌ Error executing migrations:', error);
    throw error;
  }
}
