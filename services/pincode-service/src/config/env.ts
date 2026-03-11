import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

export const EnvSchema = z.object({
    APP_PORT: z.string().default('8083'),
    APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    DB_HOST: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    REDIS_HOST: z.string().optional(),
    APP_JWT_SECRET: z.string().default('test_secret'),
});

export const env = EnvSchema.parse(process.env);
