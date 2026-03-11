import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

export const EnvSchema = z.object({
    APP_PORT: z.string().default('8080'),
    APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    DB_HOST: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    APP_JWT_SECRET: z.string().default('test_secret'),
    REDIS_HOST: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
