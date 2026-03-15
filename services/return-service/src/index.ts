import { createBaseApp, logger, globalErrorHandler } from '@fs/shared';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import returnRoutes from './routes/return.routes';

const app = createBaseApp({ serviceName: 'return-service' });

app.use('/api', returnRoutes);

app.use(globalErrorHandler);

async function bootstrap() {
  try {
    await runMigrations();
    
    app.listen(env.APP_PORT, () => {
      logger.info(`✅ Return Service listening on port ${env.APP_PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start Return Service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

export default app;
