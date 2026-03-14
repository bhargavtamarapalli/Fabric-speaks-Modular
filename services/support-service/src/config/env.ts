import { z } from 'zod';
import { loadEnv } from '@fs/shared';

const envSchema = {
  // Add service specific env vars here if any
};

export const env = loadEnv(envSchema);
