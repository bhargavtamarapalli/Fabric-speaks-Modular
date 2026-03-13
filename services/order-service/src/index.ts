import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import { env } from './config/env';
import orderRoutes from './routes/order.routes';

const app = createBaseApp({ serviceName: 'order-service' });

app.use('/api', orderRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(env.APP_PORT, () => {
    logger.info(`Order Service running on port ${env.APP_PORT}`);
  });
}

export default app;
