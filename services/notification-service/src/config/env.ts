import { z } from 'zod';
import { loadEnv } from '@fs/shared';

const envSchema = {
  // WhatsApp Config
  WHATSAPP_API_KEY: z.string().min(1, 'WhatsApp API Key is required'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1, 'WhatsApp Phone Number ID is required'),

  // SMS Config
  TWILIO_ACCOUNT_SID: z.string().min(1, 'Twilio Account SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Twilio Auth Token is required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'Twilio Phone Number is required'),

  // Admin Alerts
  ADMIN_PHONE: z.string().default('+910000000000'),

  // Other Config
  WHATSAPP_LANGUAGE: z.string().default('en_US'),
};

export const env = loadEnv(envSchema);
