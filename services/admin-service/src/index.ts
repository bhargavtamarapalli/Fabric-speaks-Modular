import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { globalErrorHandler } from '@fs/shared/middleware';
import { logger } from '@fs/shared/logger';

// Admin service environment validation
const EnvSchema = z.object({
  APP_PORT: z.string().default('8008'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DB_HOST: z.string(),
  DB_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
});

export const env = EnvSchema.parse(process.env);

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true })); // Allow gateway to pass cookies/headers
app.use(express.json({ limit: '5mb' })); // CMS pages might have large HTML bodies

import { adminRouter } from './routes/admin.routes';

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-service', timestamp: new Date().toISOString() });
});

// Routes will be mounted here
app.use('/api/v1/admin', adminRouter);

app.use(globalErrorHandler);

export const startServer = () => {
  app.listen(env.APP_PORT, () => {
    logger.info(`Admin Service running on port ${env.APP_PORT} in ${env.APP_ENV} mode`);
  });
};

if (require.main === module) {
  startServer();
}

export default app;
