import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import supportRoutes from './routes/support.routes';
import { env } from './config/env';
import { SupportAlertWorker } from './workers/SupportAlertWorker';

const app = createBaseApp({ serviceName: 'support-service' });
const supportAlertWorker = new SupportAlertWorker();

app.use('/api', supportRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  const server = app.listen(env.APP_PORT, () => {
    logger.info(`Support Service running on port ${env.APP_PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down support service...`);
    server.close(async () => {
      await supportAlertWorker.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
