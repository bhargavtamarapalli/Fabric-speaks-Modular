import { z } from 'zod';
import { loadEnv } from '@fs/shared';

export const EnvSchema = {
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
};

export const env = loadEnv(EnvSchema);
