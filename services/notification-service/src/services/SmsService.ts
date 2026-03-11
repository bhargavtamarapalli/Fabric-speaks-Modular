import { env } from '../config/env';
import { logger } from '@fs/shared';

export interface SmsPayload {
  to: string;
  body: string;
}

export class SmsService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = env.TWILIO_ACCOUNT_SID;
    this.authToken = env.TWILIO_AUTH_TOKEN;
    this.fromNumber = env.TWILIO_PHONE_NUMBER;
  }

  async sendSms(payload: SmsPayload): Promise<any> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', payload.to);
    params.append('From', this.fromNumber);
    params.append('Body', payload.body);

    try {
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
        logger.error(`❌ SMS API Error:`, data);
        throw new Error(`SMS API Error: ${JSON.stringify(data)}`);
      }

      logger.info(`✅ SMS message sent to ${payload.to}`);
      return data;
    } catch (error) {
      logger.error(`Failed to send SMS to ${payload.to}`, error);
      throw error;
    }
  }
}
