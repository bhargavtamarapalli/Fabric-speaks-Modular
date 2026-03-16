import { env } from '../config/env';
import { fetchJsonWithRetry, logger } from '@fs/shared';

export interface SmsPayload {
  to: string;
  body: string;
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
      logger.warn(`SMS configuration missing. Returning mock success for ${payload.to}`);
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
          idempotent: true,
          retryOnNetworkError: true,
          operation: 'sms.send'
        }
      );
      logger.info(`SMS message sent to ${payload.to}`);
      return data;
    } catch (error) {
      logger.error(`Failed to send SMS to ${payload.to} after retries`, error);
      throw error;
    }
  }
}
