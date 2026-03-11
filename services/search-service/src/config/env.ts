import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

export const EnvSchema = z.object({
    APP_PORT: z.string().default('8084'),
    APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    DB_HOST: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    REDIS_HOST: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
