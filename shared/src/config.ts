import { z } from 'zod';
import * as dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

export const BaseEnvSchema = z.object({
  APP_PORT: z.string().default('8080'),
  APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().default('5432').transform(Number),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  APP_JWT_SECRET: z.string().default('test_secret'),
});

export type BaseEnv = z.infer<typeof BaseEnvSchema>;

/**
 * Loads and validates environment variables using a provided Zod schema,
 * merged with a standard base schema for microservices.
 */
export function loadEnv<T extends z.ZodRawShape>(serviceSchema: T) {
  const mergedSchema = BaseEnvSchema.extend(serviceSchema);
  
  try {
    return mergedSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Invalid environment variables:', error.format());
    } else {
      logger.error('❌ Failed to load environment variables:', error);
    }
    process.exit(1);
  }
}
