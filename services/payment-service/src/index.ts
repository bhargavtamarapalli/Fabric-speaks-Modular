import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import { env } from './config/env';
import paymentRoutes from './routes/payment.routes';

const app = createBaseApp({ serviceName: 'payment-service', captureRawBody: true });

app.use('/api', paymentRoutes);

app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(env.APP_PORT, () => {
    logger.info(`Payment Service running on port ${env.APP_PORT}`);
  });
}

export default app;
