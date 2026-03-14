import { loadEnv } from '@fs/shared';
import { z } from 'zod';

const EnvSchema = z.object({
  APP_PORT: z.string().default('8011'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DB_HOST: z.string(),
  DB_PORT: z.string().default('5432'),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string().default('6379'),
});

export const env = EnvSchema.parse(loadEnv({}));
