import { env } from '../config/env';
import { logger } from '@fs/shared';
import pRetry from 'p-retry';

export interface WhatsAppMessagePayload {
  to: string;
  templateName: string;
  components?: any[]; // Flexible array for template variables
}

export class WhatsAppService {
  private apiUrl: string;
  private token: string;

  constructor() {
    this.apiUrl = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID || 'mock-phone'}/messages`;
    this.token = env.WHATSAPP_API_KEY || '';
  }

  async sendTemplateMessage(payload: WhatsAppMessagePayload): Promise<any> {
    if (!env.WHATSAPP_API_KEY || !env.WHATSAPP_PHONE_NUMBER_ID) {
      logger.warn(`WhatsApp configuration missing. Returning mock success for ${payload.to}`);
      return {
        provider: 'mock-whatsapp',
        messages: [{ id: `mock-wa-${Date.now()}` }],
      };
    }

    const run = async () => {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'template',
          template: {
            name: payload.templateName,
            language: {
              code: env.WHATSAPP_LANGUAGE
            },
            components: payload.components || []
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error(`❌ WhatsApp API Error (Attempt):`, data);
        throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
      }

      return data;
    };

    try {
      const data = await pRetry(run, {
        retries: 3,
        onFailedAttempt: error => {
          logger.warn(`WhatsApp attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      });
      logger.info(`✅ WhatsApp message sent to ${payload.to} with template ${payload.templateName}`);
      return data;
    } catch (error) {
      logger.error(`Failed to send WhatsApp message to ${payload.to} after retries`, error);
      throw error;
    }
  }
}
