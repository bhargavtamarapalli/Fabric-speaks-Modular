import { z } from 'zod';
import { loadEnv } from '@fs/shared';

const envSchema = {
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  SHIPROCKET_API_KEY: z.string().optional(),
  SHIPROCKET_EMAIL: z.string().email().optional().or(z.literal('')),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_WEBHOOK_SECRET: z.string().optional(),
  SHIPROCKET_API_URL: z.string().default('https://apiv2.shiprocket.in/v1/external'),
  SHIPROCKET_PICKUP_LOCATION: z.string().default('Primary'),
};

export const env = loadEnv(envSchema);
