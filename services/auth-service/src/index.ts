import { createBaseApp, globalErrorHandler, logger } from '@fs/shared';
import { authRouter } from './routes/auth.routes';
import { env } from './config/env';
import { UserSyncWorker } from './workers/user-sync.worker';

const app = createBaseApp({ serviceName: 'auth-service' });
const userSyncWorker = new UserSyncWorker();

app.use('/api/v1/auth', authRouter);

app.use(globalErrorHandler);

const port = env.APP_PORT;
const server = app.listen(port, () => {
    logger.info(`auth-service running on port ${port} in ${env.APP_ENV} mode`);
});

const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down auth service...`);
    server.close(async () => {
        const forceExit = setTimeout(() => process.exit(1), 10000);
        try {
            await userSyncWorker.close();
            clearTimeout(forceExit);
            process.exit(0);
        } catch {
            process.exit(1);
        }
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
