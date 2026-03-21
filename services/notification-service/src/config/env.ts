import { z } from 'zod';
import { loadEnv } from '@fs/shared';

const envSchema = {
  // WhatsApp Config
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),

  // SMS Config
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Admin Alerts
  ADMIN_PHONE: z.string().regex(/^\+91[0-9]{10}$/, 'Invalid Indian phone number format').default('+910000000000'),

  // Other Config
  WHATSAPP_LANGUAGE: z.string().default('en_US'),
};

export const env = loadEnv(envSchema);
