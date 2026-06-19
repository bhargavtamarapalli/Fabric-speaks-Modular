import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

// Try to load service-specific .env first, then fall back to root
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),           // Service's own .env
  path.resolve(__dirname, '../../../.env'),       // Root .env from node_modules
  path.resolve(__dirname, '../../.env'),          // Alternative root path
];

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded .env from:', envPath);
  }
}

if (process.env.REDIS_URL) {
  console.log(`REDIS_URL configured (length: ${process.env.REDIS_URL.length})`);
}

if (!process.env.APP_JWT_SECRET && process.env.JWT_SECRET) {
  process.env.APP_JWT_SECRET = process.env.JWT_SECRET;
}

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
  JWT_SECRET: z.string().optional(),
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
  const mergedSchema = BaseEnvSchema.extend(serviceSchema).superRefine((env, ctx) => {
    if (env.JWT_SECRET && env.APP_JWT_SECRET && env.JWT_SECRET !== env.APP_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET must match APP_JWT_SECRET',
        path: ['JWT_SECRET']
      });
    }
    const requireStrongSecret = env.APP_ENV === 'production' || env.APP_ENV === 'staging';
    if (requireStrongSecret) {
      if (!env.APP_JWT_SECRET || env.APP_JWT_SECRET === 'test_secret' || env.APP_JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'APP_JWT_SECRET must be at least 32 characters in staging/production',
          path: ['APP_JWT_SECRET']
        });
      }
    }
  });

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
