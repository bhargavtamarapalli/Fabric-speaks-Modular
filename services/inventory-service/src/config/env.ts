import { loadEnv } from '@fs/shared';
import { z } from 'zod';

const envSchema = {
    PORT: z.string().default('8004'),
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development')
};

export const env = loadEnv(envSchema);
