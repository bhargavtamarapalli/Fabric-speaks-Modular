import express, { Request, Response } from 'express';
import { z } from 'zod';
import { globalErrorHandler } from '@fs/shared';
import { authRouter } from './routes/auth.routes';
import cookieParser from 'cookie-parser';

import { env } from './config/env';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Health check route
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'auth-service' });
});

app.use('/api/v1/auth', authRouter);

app.use(globalErrorHandler);

if (require.main === module) {
    app.listen(parseInt(env.APP_PORT), () => {
        console.log(`auth-service running on port ${env.APP_PORT} in ${env.APP_ENV} mode`);
    });
}

export default app;
