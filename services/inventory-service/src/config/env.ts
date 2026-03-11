import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from '@fs/shared';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3007'),
  DATABASE_URL: z.string().url(),
  APP_JWT_SECRET: z.string().min(32, 'APP_JWT_SECRET must be at least 32 characters')
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('❌ Invalid environment variables in Inventory Service:', error.format());
  }
  process.exit(1);
}

export { env };
