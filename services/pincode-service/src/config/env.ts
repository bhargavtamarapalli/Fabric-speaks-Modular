import { loadEnv } from '@fs/shared';
import { z } from 'zod';

const envSchema = {
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
};

export const env = loadEnv(envSchema);
