import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export const getDbPool = (): Pool => {
  if (!pool) {
    const config: PoolConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
    
    // In production, we might want to configure SSL, max connections, etc.
    if (process.env.APP_ENV === 'production') {
      config.max = 20;
      config.idleTimeoutMillis = 30000;
      config.connectionTimeoutMillis = 2000;
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle pg client', err);
      process.exit(-1);
    });
  }
  return pool;
};
