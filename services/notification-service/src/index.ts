import { logger } from '@fs/shared';
import { db } from './db';
import { env } from './config/env';

async function bootstrap() {
  try {
    logger.info('Starting Notification Service...');
    
    // Connect to DB (using imported db object)
    // Connect to Redis / BullMQ
    
    logger.info(`Notification Service is running in ${env.NODE_ENV} mode`);
    logger.info('Listening for events on BullMQ...');
    
  } catch (error) {
    logger.error('Failed to start Notification Service:', error);
    process.exit(1);
  }
}

bootstrap();
