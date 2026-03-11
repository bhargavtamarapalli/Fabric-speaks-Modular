import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationCoordinator } from '../services/NotificationCoordinator';
import { LoyaltyScheduler } from '../workers/LoyaltyScheduler';

// Mock dependencies
vi.mock('../services/NotificationCoordinator', () => {
  return {
    NotificationCoordinator: vi.fn().mockImplementation(() => {
      return {
        processNotification: vi.fn().mockResolvedValue(undefined)
      };
    })
  };
});

vi.mock('../workers/LoyaltyScheduler', () => {
  return {
    LoyaltyScheduler: vi.fn().mockImplementation(() => {
      return {
        scheduleLoyaltySequence: vi.fn().mockResolvedValue(undefined)
      };
    })
  };
});

// Have to require it after mocking
import { EventConsumer } from '../workers/EventConsumer';
import { Job } from 'bullmq';

describe('EventConsumer Routing', () => {
  let consumer: any;
  let mockCoordinator: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    consumer = new EventConsumer();
    mockCoordinator = consumer.coordinator;
  });

  it('routes order.created to WhatsApp order_confirmation', async () => {
    const job = {
      name: 'order.created',
      data: {
        userId: 'u1',
        orderId: 'o1',
        customerPhone: '+919999999999',
        totalAmount: '1500'
      }
    } as unknown as Job;

    await consumer['handleEvent'](job);

    expect(mockCoordinator.processNotification).toHaveBeenCalledWith({
      userId: 'u1',
      orderId: 'o1',
      eventType: 'order.created',
      recipientPhone: '+919999999999',
      waTemplateName: 'order_confirmation',
      waComponents: [
        { type: 'body', parameters: [{ type: 'text', text: 'o1' }, { type: 'text', text: '1500' }] }
      ],
      fallbackSmsBody: expect.stringContaining('confirmed')
    });
  });

  it('routes order.delivered and schedules loyalty', async () => {
    const job = {
      name: 'order.delivered',
      data: {
        userId: 'u2',
        orderId: 'o2',
        customerPhone: '+919999999998',
        fabricType: 'Silk'
      }
    } as unknown as Job;

    await consumer['handleEvent'](job);

    expect(mockCoordinator.processNotification).toHaveBeenCalledWith(expect.objectContaining({
      waTemplateName: 'delivery_confirmation',
    }));

    // Verify scheduler was called
    const schedulerInstance = vi.mocked(LoyaltyScheduler).mock.results[0].value;
    expect(schedulerInstance.scheduleLoyaltySequence).toHaveBeenCalledWith(job.data);
  });
});
