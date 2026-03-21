import { env } from '../config/env';
import { fetchJsonWithRetry, logger } from '@fs/shared';

export interface SmsPayload {
  to: string;
  body: string;
}

// Mask phone number for logging (show only last 4 digits)
function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) return '*'.repeat(phone.length);
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

export class SmsService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = env.TWILIO_ACCOUNT_SID || '';
    this.authToken = env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = env.TWILIO_PHONE_NUMBER || '';
  }

  async sendSms(payload: SmsPayload): Promise<any> {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      const maskedPhone = maskPhoneNumber(payload.to);
      const env_name = process.env.NODE_ENV || 'development';
      
      if (env_name === 'production' || env_name === 'staging') {
        const error = new Error(
          `SMS service not configured in ${env_name} environment. Cannot send SMS to ${maskedPhone}.`
        );
        logger.error({ maskedPhone, env: env_name }, error.message);
        throw error;
      }
      
      // In development/test, return mock success
      logger.warn(`SMS configuration missing in ${env_name}. Returning mock success for ${maskedPhone}`);
      return {
        provider: 'mock-sms',
        sid: `mock-sms-${Date.now()}`
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', payload.to);
    params.append('From', this.fromNumber);
    params.append('Body', payload.body);

    const maskedPhone = maskPhoneNumber(payload.to);
    try {
      const { data } = await fetchJsonWithRetry<any>(
        url,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params
        },
        {
          method: 'POST',
          idempotent: false,
          retryOnNetworkError: false,
          operation: 'sms.send'
        }
      );
      logger.info(`SMS message sent to ${maskedPhone}`);
      return data;
    } catch (error) {
      logger.error({ maskedPhone }, `Failed to send SMS after retries`, error);
      throw error;
    }
  }
}
