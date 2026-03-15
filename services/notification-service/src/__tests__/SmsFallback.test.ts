import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationCoordinator } from '../services/NotificationCoordinator';
import { WhatsAppService } from '../services/WhatsAppService';
import { SmsService } from '../services/SmsService';
import { NotificationLogRepository } from '../repositories/NotificationLogRepository';

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    TWILIO_ACCOUNT_SID: 'test',
    TWILIO_AUTH_TOKEN: 'test',
    TWILIO_PHONE_NUMBER: 'test',
    WHATSAPP_API_KEY: 'test',
    WHATSAPP_PHONE_NUMBER_ID: 'test'
  }
}));

vi.mock('../services/WhatsAppService');
vi.mock('../services/SmsService');
vi.mock('../repositories/NotificationLogRepository');

describe('NotificationCoordinator - SMS Fallback', () => {
  let coordinator: NotificationCoordinator;
  let mockWaService: any;
  let mockSmsService: any;
  let mockLogRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWaService = new WhatsAppService() as any;
    mockSmsService = new SmsService() as any;
    mockLogRepo = new NotificationLogRepository({} as any) as any;
    
    // We mock the constructor in Coordinator since we can't easily inject them
    // Alternatively, we just mock the module and access instances.
    // For simplicity, we re-instantiate our own test coordinator and assign mocks
    coordinator = new NotificationCoordinator();
    (coordinator as any).waService = mockWaService;
    (coordinator as any).smsService = mockSmsService;
    (coordinator as any).logRepo = mockLogRepo;

    mockLogRepo.createLog.mockResolvedValue({ id: 'log-123' });
    mockLogRepo.updateStatus.mockResolvedValue(true);
  });

  it('triggers SMS fallback when WhatsApp fails', async () => {
    // WhatsApp throws an error
    mockWaService.sendTemplateMessage.mockRejectedValue(new Error('API Down'));
    // SMS succeeds
    mockSmsService.sendSms.mockResolvedValue({ sid: 'sms-987' });

    await coordinator.processNotification({
      eventType: 'payment.captured',
      recipientPhone: '+919999999999',
      waTemplateName: 'payment_confirmed',
      fallbackSmsBody: 'Payment successful.'
    });

    expect(mockWaService.sendTemplateMessage).toHaveBeenCalledTimes(1);
    expect(mockSmsService.sendSms).toHaveBeenCalledTimes(1);
    expect(mockSmsService.sendSms).toHaveBeenCalledWith({
      to: '+919999999999',
      body: 'Payment successful.'
    });

    // Verify it updated the WA log to FAILED
    expect(mockLogRepo.updateStatus).toHaveBeenCalledWith('log-123', 'FAILED', expect.any(Object));

    // Verify it created an SMS request log
    expect(mockLogRepo.createLog).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'SMS',
      status: 'PENDING'
    }));
  });

  it('does NOT trigger SMS fallback if WhatsApp succeeds', async () => {
    mockWaService.sendTemplateMessage.mockResolvedValue({ message_id: 'wa-123' });

    await coordinator.processNotification({
      eventType: 'payment.captured',
      recipientPhone: '+919999999999',
      waTemplateName: 'payment_confirmed',
      fallbackSmsBody: 'Payment successful.'
    });

    expect(mockWaService.sendTemplateMessage).toHaveBeenCalledTimes(1);
    expect(mockSmsService.sendSms).not.toHaveBeenCalled();

    // Verify it updated the WA log to SENT
    expect(mockLogRepo.updateStatus).toHaveBeenCalledWith('log-123', 'SENT', expect.any(Object));
  });

  it('handles complete failure when both WhatsApp and SMS fail', async () => {
    mockWaService.sendTemplateMessage.mockRejectedValue(new Error('WA Down'));
    mockSmsService.sendSms.mockRejectedValue(new Error('SMS Down'));
    // Ensure the fallback sms log gets a different ID
    mockLogRepo.createLog.mockResolvedValueOnce({ id: 'log-wa' }).mockResolvedValueOnce({ id: 'log-sms' });

    await coordinator.processNotification({
      eventType: 'payment.captured',
      recipientPhone: '+919999999999',
      waTemplateName: 'payment_confirmed',
      fallbackSmsBody: 'Payment successful.'
    });

    expect(mockWaService.sendTemplateMessage).toHaveBeenCalledTimes(1);
    expect(mockSmsService.sendSms).toHaveBeenCalledTimes(1);

    // Verify it updated the WA log to FAILED
    expect(mockLogRepo.updateStatus).toHaveBeenCalledWith('log-wa', 'FAILED', expect.objectContaining({ error: 'WA Down' }));

    // Verify it created an SMS request log and updated it to FAILED
    expect(mockLogRepo.createLog).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'SMS',
      status: 'PENDING'
    }));
    expect(mockLogRepo.updateStatus).toHaveBeenCalledWith('log-sms', 'FAILED', expect.objectContaining({ error: 'SMS Down' }));
  });
});
