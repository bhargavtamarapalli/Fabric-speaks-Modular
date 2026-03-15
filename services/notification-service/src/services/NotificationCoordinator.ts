import { WhatsAppService } from './WhatsAppService';
import { SmsService } from './SmsService';
import { NotificationLogRepository } from '../repositories/NotificationLogRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { logger, getDbPool } from '@fs/shared';

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
  private auditLogRepo: AuditLogRepository;

  constructor() {
    this.waService = new WhatsAppService();
    this.smsService = new SmsService();
    const db = getDbPool();
    this.logRepo = new NotificationLogRepository(db);
    this.auditLogRepo = new AuditLogRepository(db);
  }

  async processNotification(request: NotificationRequest): Promise<void> {
    let logId: string | null = null;
    try {
      // 1. Initial log as PENDING for WhatsApp
      const log = await this.logRepo.createLog({
        userId: request.userId,
        orderId: request.orderId,
        eventType: request.eventType,
        recipient: request.recipientPhone,
        channel: 'WHATSAPP',
        status: 'PENDING',
        templateId: request.waTemplateName
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
      } catch (waError: unknown) {
        const errorMessage = waError instanceof Error ? waError.message : 'Unknown error';
        logger.warn(`WhatsApp failed for ${request.recipientPhone}, falling back to SMS...`);
        await this.logRepo.updateStatus(logId, 'FAILED', { error: errorMessage });
      }

      // 3. Fallback to SMS
      const smsLog = await this.logRepo.createLog({
        userId: request.userId,
        orderId: request.orderId,
        eventType: request.eventType,
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
      } catch (smsError: unknown) {
        const errorMessage = smsError instanceof Error ? smsError.message : 'Unknown error';
        logger.error(`SMS fallback completely failed for ${request.recipientPhone}`);
        await this.logRepo.updateStatus(smsLog.id, 'FAILED', { error: errorMessage });
      }
    } catch (error) {
      logger.error(`Critical failure in NotificationCoordinator for ${request.recipientPhone}`, error);
    }
  }

  async broadcast(request: { recipientPhones: string[]; waTemplateName: string; waComponents?: any[]; fallbackSmsBody: string }, adminId: string): Promise<{ successCount: number; failedCount: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const phone of request.recipientPhones) {
      try {
        await this.processNotification({
          eventType: 'ADMIN_BROADCAST',
          recipientPhone: phone,
          waTemplateName: request.waTemplateName,
          waComponents: request.waComponents,
          fallbackSmsBody: request.fallbackSmsBody
        });
        successCount++;
      } catch (error) {
        failedCount++;
        logger.error(`Broadcast failed for ${phone}`, error);
      }
    }

    // RULE 6: Log broadcast action
    await this.auditLogRepo.insert({
        adminId,
        action: 'ADMIN_BROADCAST',
        entityType: 'NOTIFICATION',
        entityId: 'BATCH',
        afterJson: {
            recipientCount: request.recipientPhones.length,
            successCount,
            failedCount,
            template: request.waTemplateName
        }
    });

    return { successCount, failedCount };
  }
}
