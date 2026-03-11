import express from 'express';
import cookieParser from 'cookie-parser';
import { logger, globalErrorHandler } from '@fs/shared';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import inventoryRoutes from './routes/inventory.routes';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Only mapping to /admin/inventory since these are admin-only operations
app.use('/admin/inventory', inventoryRoutes);

app.use(globalErrorHandler);

async function bootstrap() {
  try {
    await runMigrations();
    
    app.listen(env.PORT, () => {
      logger.info(`✅ Inventory Service listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('❌ Failed to start Inventory Service:', error);
    process.exit(1);
  }
}

bootstrap();
