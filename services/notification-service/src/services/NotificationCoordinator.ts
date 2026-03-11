import { WhatsAppService, WhatsAppMessagePayload } from './WhatsAppService';
import { SmsService, SmsPayload } from './SmsService';
import { NotificationLogRepository } from '../repositories/NotificationLogRepository';
import { logger } from '@fs/shared';

export interface NotificationRequest {
  userId?: string;
  orderId?: string;
  eventType: string;
  recipientPhone: string;
  waTemplateName: string;
  waComponents?: any[];
  fallbackSmsBody: string;
}

export class NotificationCoordinator {
  private waService: WhatsAppService;
  private smsService: SmsService;
  private logRepo: NotificationLogRepository;

  constructor() {
    this.waService = new WhatsAppService();
    this.smsService = new SmsService();
    this.logRepo = new NotificationLogRepository();
  }

  async processNotification(request: NotificationRequest): Promise<void> {
    let logId: string | null = null;
    try {
      // 1. Initial log as PENDING for WhatsApp
      const log = await this.logRepo.createLog({
        user_id: request.userId,
        order_id: request.orderId,
        event_type: request.eventType,
        recipient: request.recipientPhone,
        channel: 'WHATSAPP',
        status: 'PENDING',
        template_id: request.waTemplateName
      });
      logId = log.id;

      // 2. Attempt WhatsApp
      try {
        const waResponse = await this.waService.sendTemplateMessage({
          to: request.recipientPhone,
          templateName: request.waTemplateName,
          components: request.waComponents
        });
        
        await this.logRepo.updateStatus(logId, 'SENT', waResponse);
        return; // Success, exit
      } catch (waError: any) {
        logger.warn(`WhatsApp failed for ${request.recipientPhone}, falling back to SMS...`);
        await this.logRepo.updateStatus(logId, 'FAILED', { error: waError.message });
      }

      // 3. Fallback to SMS
      const smsLog = await this.logRepo.createLog({
        user_id: request.userId,
        order_id: request.orderId,
        event_type: request.eventType,
        recipient: request.recipientPhone,
        channel: 'SMS',
        status: 'PENDING'
      });

      try {
        const smsResponse = await this.smsService.sendSms({
          to: request.recipientPhone,
          body: request.fallbackSmsBody
        });
        
        await this.logRepo.updateStatus(smsLog.id, 'SENT', smsResponse);
      } catch (smsError: any) {
        logger.error(`SMS fallback completely failed for ${request.recipientPhone}`);
        await this.logRepo.updateStatus(smsLog.id, 'FAILED', { error: smsError.message });
      }
    } catch (error) {
      logger.error(`Critical failure in NotificationCoordinator for ${request.recipientPhone}`, error);
    }
  }
}
