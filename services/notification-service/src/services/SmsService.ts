import { env } from '../config/env';
import { logger } from '@fs/shared';
import pRetry from 'p-retry';

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

    const run = async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error(`❌ SMS API Error (Attempt):`, data);
        throw new Error(`SMS API Error: ${JSON.stringify(data)}`);
      }

      return data;
    };

    try {
      const data = await pRetry(run, {
        retries: 3,
        onFailedAttempt: error => {
          logger.warn(`SMS attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      });
      logger.info(`✅ SMS message sent to ${payload.to}`);
      return data;
    } catch (error) {
      logger.error(`Failed to send SMS to ${payload.to} after retries`, error);
      throw error;
    }
  }
}
