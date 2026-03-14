import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import { env } from './config/env';
import { EventConsumer } from './workers/EventConsumer';

const app = createBaseApp({ serviceName: 'notification-service' });

const eventConsumer = new EventConsumer();
// eventConsumer doesn't have a start method, it usually starts in constructor or similar
// I'll check the file content next to be sure.

app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(env.APP_PORT, () => {
    logger.info(`Notification Service running on port ${env.APP_PORT}`);
  });
}

export default app;
