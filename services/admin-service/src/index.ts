import { createBaseApp, logger, globalErrorHandler } from '@fs/shared';
import { env } from './config/env';
import adminRoutes from './routes/admin.routes';
import { runMigrations } from './db/migrate';

const app = createBaseApp({ serviceName: 'admin-service' });

// The admin service has a central router that mounts all sub-routes
app.use('/api/v1/admin', adminRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  const start = async () => {
    await runMigrations();
    app.listen(env.APP_PORT, () => {
      logger.info(`? Admin Service listening on port ${env.APP_PORT}`);
    });
  };

  start().catch((error) => {
    logger.error('? Failed to start Admin Service:', error);
    process.exit(1);
  });
}

export default app;
