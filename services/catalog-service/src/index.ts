import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import { catalogRouter } from './routes/catalog.routes';
import { env } from './config/env';

const app = createBaseApp({ serviceName: 'catalog-service' });

app.use('/api/v1', catalogRouter);

app.use(globalErrorHandler);

const port = env.APP_PORT;
app.listen(port, () => {
    logger.info(`Catalog Service listening on port ${port}`);
});

export default app;
