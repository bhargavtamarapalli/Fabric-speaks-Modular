import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import supportRoutes from './routes/support.routes';
import { env } from './config/env';

const app = createBaseApp({ serviceName: 'support-service' });

app.use('/api', supportRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(env.APP_PORT, () => {
    logger.info(`Support Service running on port ${env.APP_PORT}`);
  });
}

export default app;
