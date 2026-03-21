import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import { catalogRouter } from './routes/catalog.routes';
import { env } from './config/env';
import { PriceChangeWorker } from './workers/price-change.worker';

const app = createBaseApp({ serviceName: 'catalog-service' });
const priceChangeWorker = new PriceChangeWorker();

app.use('/api/v1', catalogRouter);

app.use(globalErrorHandler);

const port = env.APP_PORT;
const server = app.listen(port, () => {
    logger.info(`Catalog Service listening on port ${port}`);
});

const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down catalog service...`);
    server.close(async () => {
        await priceChangeWorker.close();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
