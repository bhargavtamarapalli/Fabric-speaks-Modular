import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import pincodeRoutes from './routes/pincode.routes';
import { env } from './config/env';

const app = createBaseApp({ serviceName: 'pincode-service' });

app.use('/api', pincodeRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(env.APP_PORT, () => {
    logger.info(`Pincode Service running on port ${env.APP_PORT}`);
  });
}

export default app;
