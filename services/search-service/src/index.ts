import { createBaseApp, logger, globalErrorHandler } from '@fs/shared';
import searchRoutes from './routes/search.routes';
import { env } from './config/env';

const app = createBaseApp({ serviceName: 'search-service' });

app.use('/api', searchRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(env.APP_PORT, () => {
    logger.info(`Search Service running on port ${env.APP_PORT}`);
  });
}

export default app;
