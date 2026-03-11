import express from 'express';
import cookieParser from 'cookie-parser';
import { logger, globalErrorHandler } from '@fs/shared';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import returnRoutes from './routes/return.routes';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/', returnRoutes);

app.use(globalErrorHandler);

async function bootstrap() {
  try {
    await runMigrations();
    
    app.listen(env.PORT, () => {
      logger.info(`✅ Return Service listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('❌ Failed to start Return Service:', error);
    process.exit(1);
  }
}

bootstrap();
