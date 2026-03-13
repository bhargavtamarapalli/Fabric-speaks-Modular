import { createBaseApp, globalErrorHandler } from '@fs/shared';
import { authRouter } from './routes/auth.routes';
import { env } from './config/env';

const app = createBaseApp({ serviceName: 'auth-service' });

app.use('/api/v1/auth', authRouter);

app.use(globalErrorHandler);

if (require.main === module) {
    app.listen(env.APP_PORT, () => {
        console.log(`auth-service running on port ${env.APP_PORT} in ${env.APP_ENV} mode`);
    });
}

export default app;
