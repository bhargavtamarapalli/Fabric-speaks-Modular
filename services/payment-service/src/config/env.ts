import { z } from 'zod';
import { loadEnv } from '@fs/shared';

const envSchema = {
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
};

export const env = loadEnv(envSchema);
