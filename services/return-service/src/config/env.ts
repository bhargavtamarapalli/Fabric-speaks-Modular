import { loadEnv } from '@fs/shared';
import { z } from 'zod';

export const env = loadEnv({
  ORDER_SERVICE_URL: z.string().default('http://order-service:8080'),
  PAYMENT_SERVICE_URL: z.string().default('http://payment-service:8080'),
  SHIPROCKET_API_KEY: z.string().optional(),
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_API_URL: z.string().default('https://apiv2.shiprocket.in/v1/external'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_API_URL: z.string().default('https://api.razorpay.com/v1'),
});
