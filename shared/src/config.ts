import { z } from 'zod';
import * as dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

export const BaseEnvSchema = z.object({
  APP_PORT: z.string().default('8080'),
  APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  // Standard DB connection params (legacy support)
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().default('5432').transform(Number),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  // URL-based connection (Modern/Supabase format)
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  // Redis connection
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_URL: z.string().optional(),
  APP_JWT_SECRET: z.string().default('test_secret'),
  // Google Cloud Configuration
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GCS_MEDIA_BUCKET: z.string().optional(),
  GCS_CREDENTIALS: z.string().optional(), // Path to service account key for local dev
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
