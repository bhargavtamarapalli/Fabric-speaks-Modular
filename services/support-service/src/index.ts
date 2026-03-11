import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { globalErrorHandler } from '@fs/shared/middleware';
import { logger } from '@fs/shared/logger';
import { supportRouter } from './routes/support.routes';

const EnvSchema = z.object({
  APP_PORT: z.string().default('8009'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DB_HOST: z.string(),
  DB_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
});

export const env = EnvSchema.parse(process.env);

const app = express();
// app.use(helmet());
// app.use(cors({ origin: true, credentials: true }));
// app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'support-service', timestamp: new Date().toISOString() });
});

app.use('/api/v1/support', supportRouter);

app.use(globalErrorHandler);

export const startServer = () => {
  app.listen(env.APP_PORT, () => {
    logger.info(`Support Service running on port ${env.APP_PORT} in ${env.APP_ENV} mode`);
  });
};

if (require.main === module) {
  startServer();
}

export default app;
