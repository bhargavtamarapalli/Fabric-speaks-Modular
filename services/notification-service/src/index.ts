import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import { env } from './config/env';
import { EventConsumer } from './workers/EventConsumer';

const app = createBaseApp({ serviceName: 'notification-service' });
const eventConsumer = new EventConsumer();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(globalErrorHandler);

const start = () => {
  const server = app.listen(env.APP_PORT, () => {
    logger.info(`✅ Notification Service listening on port ${env.APP_PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await eventConsumer.close();
      logger.info('Event consumer closed.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

if (require.main === module) {
  start();
}

export default app;
