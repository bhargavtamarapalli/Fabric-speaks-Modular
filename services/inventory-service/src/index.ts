import { createBaseApp, logger, globalErrorHandler } from '@fs/shared';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import inventoryRoutes from './routes/inventory.routes';

const app = createBaseApp({ serviceName: 'inventory-service' });

app.use('/admin/inventory', inventoryRoutes);

app.use(globalErrorHandler);

async function bootstrap() {
  try {
    await runMigrations();
    
    app.listen(env.APP_PORT, () => {
      logger.info(`✅ Inventory Service listening on port ${env.APP_PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start Inventory Service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

export default app;
