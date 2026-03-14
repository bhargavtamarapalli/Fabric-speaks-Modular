import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import cartRoutes from './routes/cart.routes';
import { env } from './config/env';

const app = createBaseApp({ serviceName: 'cart-service' });

app.use('/api', cartRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(env.APP_PORT, () => {
    logger.info(`Cart Service running on port ${env.APP_PORT}`);
  });
}

export default app;
