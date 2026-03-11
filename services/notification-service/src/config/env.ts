import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from '@fs/shared';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3006'),
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),

  // WhatsApp Config
  WHATSAPP_API_KEY: z.string().min(1, 'WhatsApp API Key is required'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1, 'WhatsApp Phone Number ID is required'),

  // SMS Config
  TWILIO_ACCOUNT_SID: z.string().min(1, 'Twilio Account SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Twilio Auth Token is required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'Twilio Phone Number is required'),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('❌ Invalid environment variables in Notification Service:', error.format());
  }
  process.exit(1);
}

export { env };
