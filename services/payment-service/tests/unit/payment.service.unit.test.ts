import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ErrorCode } from '@fs/shared';
import {
  PAYMENT_EVENT,
  PAYMENT_METHOD_HINT,
  PAYMENT_STATUS,
} from '../../src/constants/payment.constants';
import { AuditLogRepository } from '../../src/repositories/audit_log.repository';
import {
  OrderPaymentContext,
  PaymentRecord,
  PaymentRepository,
} from '../../src/repositories/payment.repository';
import { PaymentService, PaymentServiceDependencies } from '../../src/services/payment.service';

interface MockDependencies {
  paymentRepo: {
    capturePaymentIfPending: ReturnType<typeof vi.fn>;
    createPayment: ReturnType<typeof vi.fn>;
    failPaymentIfPending: ReturnType<typeof vi.fn>;
    getOrderPaymentContextForUser: ReturnType<typeof vi.fn>;
    getPaymentByOrderId: ReturnType<typeof vi.fn>;
    getPaymentByOrderIdForUser: ReturnType<typeof vi.fn>;
    getPaymentByRazorpayOrderId: ReturnType<typeof vi.fn>;
    getPaymentByRazorpayPaymentId: ReturnType<typeof vi.fn>;
    markCodConfirmed: ReturnType<typeof vi.fn>;
    updatePayment: ReturnType<typeof vi.fn>;
    updatePaymentByOrderId: ReturnType<typeof vi.fn>;
  };
  auditLogRepo: {
    insert: ReturnType<typeof vi.fn>;
  };
  razorpayClient: {
    orders: {
      create: ReturnType<typeof vi.fn>;
    };
    payments: {
      fetch: ReturnType<typeof vi.fn>;
      refund: ReturnType<typeof vi.fn>;
    };
  };
  eventQueue: {
    add: ReturnType<typeof vi.fn>;
  };
  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
}

const createOrderContext = (overrides: Partial<OrderPaymentContext> = {}): OrderPaymentContext => ({
  orderId: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-123',
  totalAmount: 499.99,
  paymentMethod: 'UPI',
  isCodConfirmed: false,
  ...overrides,
});

const createPaymentRecord = (overrides: Partial<PaymentRecord> = {}): PaymentRecord => ({
  id: 'payment-123',
  orderId: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-123',
  razorpayOrderId: 'order_123',
  razorpayPaymentId: null,
  status: PAYMENT_STATUS.pending,
  amount: 499.99,
  currency: 'INR',
  methodHint: null,
  failureReason: null,
  refundId: null,
  refundAmount: null,
  cardLast4: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
});

const createDependencies = (): {
  service: PaymentService;
  mocks: MockDependencies;
  config: PaymentServiceDependencies['config'];
} => {
  const paymentRepo = {
    capturePaymentIfPending: vi.fn(),
    createPayment: vi.fn(),
    failPaymentIfPending: vi.fn(),
    getOrderPaymentContextForUser: vi.fn(),
    getPaymentByOrderId: vi.fn(),
    getPaymentByOrderIdForUser: vi.fn(),
    getPaymentByRazorpayOrderId: vi.fn(),
    getPaymentByRazorpayPaymentId: vi.fn(),
    markCodConfirmed: vi.fn(),
    updatePayment: vi.fn(),
    updatePaymentByOrderId: vi.fn(),
  };
  const auditLogRepo = {
    insert: vi.fn(),
  };
  const razorpayClient = {
    orders: {
      create: vi.fn(),
    },
    payments: {
      fetch: vi.fn(),
      refund: vi.fn(),
    },
  };
  const eventQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  };
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const config = {
    razorpayKeyId: 'rzp_test_key_id',
    razorpayKeySecret: 'rzp_test_secret',
    razorpayWebhookSecret: 'rzp_test_webhook_secret',
  };

  const service = new PaymentService({
    paymentRepo: paymentRepo as unknown as PaymentRepository,
    auditLogRepo: auditLogRepo as unknown as AuditLogRepository,
    razorpayClient,
    eventQueue,
    logger,
    config,
  });

  return {
    service,
    mocks: {
      paymentRepo,
      auditLogRepo,
      razorpayClient,
      eventQueue,
      logger,
    },
    config,
  };
};

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture a payment and persist only card last4 when the Razorpay signature is valid', async () => {
    const { service, mocks, config } = createDependencies();
    const payment = createPaymentRecord();
    const signature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${payment.razorpayOrderId}|pay_123`)
      .digest('hex');

    mocks.paymentRepo.getPaymentByRazorpayOrderId.mockResolvedValue(payment);
    mocks.razorpayClient.payments.fetch.mockResolvedValue({
      method: 'card',
      card: { last4: '4242' },
    });
    mocks.paymentRepo.capturePaymentIfPending.mockResolvedValue(
      createPaymentRecord({
        status: PAYMENT_STATUS.captured,
        razorpayPaymentId: 'pay_123',
        methodHint: 'card',
        cardLast4: '4242',
      })
    );

    const result = await service.verifyPayment({
      razorpayOrderId: payment.razorpayOrderId!,
      razorpayPaymentId: 'pay_123',
      razorpaySignature: signature,
    });

    expect(result.status).toBe(PAYMENT_STATUS.captured);
    expect(mocks.paymentRepo.capturePaymentIfPending).toHaveBeenCalledWith(
      payment.razorpayOrderId,
      expect.objectContaining({
        razorpayPaymentId: 'pay_123',
        status: PAYMENT_STATUS.captured,
        methodHint: 'card',
        cardLast4: '4242',
      })
    );
    const updatePayload = mocks.paymentRepo.capturePaymentIfPending.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(updatePayload)).not.toContain('cardNumber');
    expect(mocks.eventQueue.add).toHaveBeenCalledWith(PAYMENT_EVENT.captured, {
      orderId: payment.orderId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: 'pay_123',
    });
  });

  it('should reject a tampered signature with an AppError', async () => {
    const { service, mocks } = createDependencies();

    mocks.paymentRepo.getPaymentByRazorpayOrderId.mockResolvedValue(createPaymentRecord());

    await expect(
      service.verifyPayment({
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'totally-invalid',
      })
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
  });

  it('should reject a short malformed signature with a validation error instead of throwing a RangeError', async () => {
    const { service, mocks } = createDependencies();

    mocks.paymentRepo.getPaymentByRazorpayOrderId.mockResolvedValue(createPaymentRecord());

    await expect(
      service.verifyPayment({
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'x',
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('should return the existing payment for duplicate verify calls without re-emitting events', async () => {
    const { service, mocks } = createDependencies();
    const payment = createPaymentRecord({
      status: PAYMENT_STATUS.captured,
      razorpayPaymentId: 'pay_123',
    });

    mocks.paymentRepo.getPaymentByRazorpayOrderId.mockResolvedValue(payment);

    const result = await service.verifyPayment({
      razorpayOrderId: payment.razorpayOrderId!,
      razorpayPaymentId: 'pay_123',
      razorpaySignature: 'ignored',
    });

    expect(result).toEqual(payment);
    expect(mocks.paymentRepo.capturePaymentIfPending).not.toHaveBeenCalled();
    expect(mocks.eventQueue.add).not.toHaveBeenCalled();
  });

  it('should return the captured payment without emitting an event when another request wins the verify race', async () => {
    const { service, mocks, config } = createDependencies();
    const pendingPayment = createPaymentRecord();
    const capturedPayment = createPaymentRecord({
      status: PAYMENT_STATUS.captured,
      razorpayPaymentId: 'pay_123',
      methodHint: 'card',
      cardLast4: '4242',
    });
    const signature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${pendingPayment.razorpayOrderId}|pay_123`)
      .digest('hex');

    mocks.paymentRepo.getPaymentByRazorpayOrderId
      .mockResolvedValueOnce(pendingPayment)
      .mockResolvedValueOnce(capturedPayment);
    mocks.razorpayClient.payments.fetch.mockResolvedValue({
      method: 'card',
      card: { last4: '4242' },
    });
    mocks.paymentRepo.capturePaymentIfPending.mockResolvedValue(null);

    const result = await service.verifyPayment({
      razorpayOrderId: pendingPayment.razorpayOrderId!,
      razorpayPaymentId: 'pay_123',
      razorpaySignature: signature,
    });

    expect(result).toEqual(capturedPayment);
    expect(mocks.eventQueue.add).not.toHaveBeenCalled();
  });

  it('should use the database order total instead of the client amount when initiating payment', async () => {
    const { service, mocks } = createDependencies();

    mocks.paymentRepo.getOrderPaymentContextForUser.mockResolvedValue(createOrderContext({ totalAmount: 799.99 }));
    mocks.razorpayClient.orders.create.mockResolvedValue({
      id: 'order_razorpay',
      amount: 79999,
      currency: 'INR',
    });
    mocks.paymentRepo.createPayment.mockResolvedValue(createPaymentRecord({ razorpayOrderId: 'order_razorpay' }));

    const result = await service.initiatePayment('user-123', {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 10,
      currency: 'INR',
    });

    expect(result).toEqual({
      razorpayOrderId: 'order_razorpay',
      amount: 79999,
      currency: 'INR',
      key: 'rzp_test_key_id',
    });
    expect(mocks.razorpayClient.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 79999,
      })
    );
    expect(mocks.logger.warn).toHaveBeenCalled();
  });

  it('should reject payment initiation when the order is missing or owned by another user', async () => {
    const { service, mocks } = createDependencies();

    mocks.paymentRepo.getOrderPaymentContextForUser.mockResolvedValue(null);

    await expect(
      service.initiatePayment('user-123', {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 500,
        currency: 'INR',
      })
    ).rejects.toMatchObject({
      code: ErrorCode.ORDER_NOT_FOUND,
    });
  });

  it('should confirm COD without calling Razorpay and emit the cod_confirmed event', async () => {
    const { service, mocks } = createDependencies();

    mocks.paymentRepo.getOrderPaymentContextForUser.mockResolvedValue(
      createOrderContext({
        paymentMethod: 'COD',
        totalAmount: 299.99,
      })
    );
    mocks.paymentRepo.markCodConfirmed.mockResolvedValue(
      createOrderContext({
        paymentMethod: 'COD',
        totalAmount: 299.99,
        isCodConfirmed: true,
      })
    );
    mocks.paymentRepo.getPaymentByOrderIdForUser.mockResolvedValue(null);
    mocks.paymentRepo.createPayment.mockResolvedValue(
      createPaymentRecord({
        razorpayOrderId: null,
        methodHint: PAYMENT_METHOD_HINT.cod,
      })
    );

    const result = await service.confirmCod('user-123', {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result).toEqual({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      isCodConfirmed: true,
      paymentStatus: PAYMENT_STATUS.pending,
    });
    expect(mocks.razorpayClient.orders.create).not.toHaveBeenCalled();
    expect(mocks.razorpayClient.payments.refund).not.toHaveBeenCalled();
    expect(mocks.eventQueue.add).toHaveBeenCalledWith(PAYMENT_EVENT.codConfirmed, {
      userId: 'user-123',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('should mark payment.failed webhooks as failed and emit the stock release event only once', async () => {
    const { service, mocks, config } = createDependencies();
    const payment = createPaymentRecord();
    const webhookBody = JSON.stringify({
      event: PAYMENT_EVENT.failed,
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            order_id: payment.razorpayOrderId,
            method: 'upi',
            error_description: 'issuer_declined',
          },
        },
      },
    });
    const signature = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(webhookBody)
      .digest('hex');

    mocks.paymentRepo.getPaymentByRazorpayOrderId
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(createPaymentRecord({ status: PAYMENT_STATUS.failed }));
    mocks.paymentRepo.failPaymentIfPending.mockResolvedValue(
      createPaymentRecord({
        status: PAYMENT_STATUS.failed,
        failureReason: 'issuer_declined',
      })
    );

    const firstResult = await service.handleWebhook({ signature, rawBody: webhookBody });
    const secondResult = await service.handleWebhook({ signature, rawBody: webhookBody });

    expect(firstResult).toEqual({
      acknowledged: true,
      processed: true,
      event: PAYMENT_EVENT.failed,
    });
    expect(secondResult).toEqual({
      acknowledged: true,
      processed: false,
    });
    expect(mocks.paymentRepo.failPaymentIfPending).toHaveBeenCalledTimes(1);
    expect(mocks.eventQueue.add).toHaveBeenCalledTimes(1);
    expect(mocks.eventQueue.add).toHaveBeenCalledWith(PAYMENT_EVENT.failed, {
      orderId: payment.orderId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: 'pay_123',
      reason: 'issuer_declined',
    });
  });

  it('should treat captured webhooks as idempotent when the payment is already captured', async () => {
    const { service, mocks, config } = createDependencies();
    const payment = createPaymentRecord({
      status: PAYMENT_STATUS.captured,
      razorpayPaymentId: 'pay_123',
      methodHint: 'card',
    });
    const webhookBody = JSON.stringify({
      event: PAYMENT_EVENT.captured,
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            order_id: payment.razorpayOrderId,
            method: 'card',
            card: {
              last4: '4242',
            },
          },
        },
      },
    });
    const signature = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(webhookBody)
      .digest('hex');

    mocks.paymentRepo.getPaymentByRazorpayOrderId.mockResolvedValue(payment);

    const result = await service.handleWebhook({ signature, rawBody: webhookBody });

    expect(result).toEqual({
      acknowledged: true,
      processed: false,
    });
    expect(mocks.paymentRepo.capturePaymentIfPending).not.toHaveBeenCalled();
    expect(mocks.eventQueue.add).not.toHaveBeenCalled();
  });

  it('should store refund.processed webhooks and mark partial refunds correctly', async () => {
    const { service, mocks, config } = createDependencies();
    const payment = createPaymentRecord({
      status: PAYMENT_STATUS.captured,
      razorpayPaymentId: 'pay_123',
    });
    const webhookBody = JSON.stringify({
      event: PAYMENT_EVENT.refundProcessed,
      payload: {
        refund: {
          entity: {
            id: 'rfnd_123',
            payment_id: 'pay_123',
            amount: 25000,
          },
        },
      },
    });
    const signature = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(webhookBody)
      .digest('hex');

    mocks.paymentRepo.getPaymentByRazorpayPaymentId.mockResolvedValue(payment);
    mocks.paymentRepo.updatePayment.mockResolvedValue(
      createPaymentRecord({
        status: PAYMENT_STATUS.partiallyRefunded,
        razorpayPaymentId: 'pay_123',
        refundId: 'rfnd_123',
        refundAmount: 250,
      })
    );

    const result = await service.handleWebhook({ signature, rawBody: webhookBody });

    expect(result).toEqual({
      acknowledged: true,
      processed: true,
      event: PAYMENT_EVENT.refundProcessed,
    });
    expect(mocks.paymentRepo.updatePayment).toHaveBeenCalledWith(
      payment.razorpayOrderId,
      expect.objectContaining({
        status: PAYMENT_STATUS.partiallyRefunded,
        refundId: 'rfnd_123',
        refundAmount: 250,
      })
    );
  });

  it('should write to admin_audit_log when an admin refunds a captured payment', async () => {
    const { service, mocks } = createDependencies();
    const payment = createPaymentRecord({
      razorpayPaymentId: 'pay_123',
      status: PAYMENT_STATUS.captured,
    });

    mocks.paymentRepo.getPaymentByOrderId.mockResolvedValue(payment);
    mocks.razorpayClient.payments.refund.mockResolvedValue({ id: 'refund_123' });
    mocks.paymentRepo.updatePayment.mockResolvedValue(
      createPaymentRecord({
        status: PAYMENT_STATUS.refunded,
        razorpayPaymentId: 'pay_123',
        refundId: 'refund_123',
        refundAmount: 99.99,
      })
    );

    const result = await service.refundPayment('admin-123', payment.orderId, {
      amount: 99.99,
      reason: 'customer_requested',
    });

    expect(result.status).toBe(PAYMENT_STATUS.refunded);
    expect(mocks.auditLogRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-123',
        action: 'PAYMENT_REFUND',
        entityType: 'PAYMENT',
        entityId: payment.id,
      })
    );
  });

  it('should reject refund requests that exceed the captured payment amount', async () => {
    const { service, mocks } = createDependencies();
    const payment = createPaymentRecord({
      razorpayPaymentId: 'pay_123',
      status: PAYMENT_STATUS.captured,
      amount: 499.99,
    });

    mocks.paymentRepo.getPaymentByOrderId.mockResolvedValue(payment);

    await expect(
      service.refundPayment('admin-123', payment.orderId, {
        amount: 600,
        reason: 'too_much',
      })
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });

    expect(mocks.razorpayClient.payments.refund).not.toHaveBeenCalled();
  });

  it('should mark partial admin refunds as PARTIALLY_REFUNDED', async () => {
    const { service, mocks } = createDependencies();
    const payment = createPaymentRecord({
      razorpayPaymentId: 'pay_123',
      status: PAYMENT_STATUS.captured,
      amount: 499.99,
    });

    mocks.paymentRepo.getPaymentByOrderId.mockResolvedValue(payment);
    mocks.razorpayClient.payments.refund.mockResolvedValue({ id: 'refund_partial' });
    mocks.paymentRepo.updatePayment.mockResolvedValue(
      createPaymentRecord({
        status: PAYMENT_STATUS.partiallyRefunded,
        razorpayPaymentId: 'pay_123',
        refundId: 'refund_partial',
        refundAmount: 199.99,
      })
    );

    const result = await service.refundPayment('admin-123', payment.orderId, {
      amount: 199.99,
      reason: 'partial_refund',
    });

    expect(result.status).toBe(PAYMENT_STATUS.partiallyRefunded);
    expect(mocks.paymentRepo.updatePayment).toHaveBeenCalledWith(
      payment.razorpayOrderId,
      expect.objectContaining({
        status: PAYMENT_STATUS.partiallyRefunded,
        refundAmount: 199.99,
      })
    );
  });

  it('should redact Razorpay secrets from logged provider errors', async () => {
    const { service, mocks, config } = createDependencies();

    mocks.paymentRepo.getOrderPaymentContextForUser.mockResolvedValue(createOrderContext());
    mocks.razorpayClient.orders.create.mockRejectedValue(
      new Error(`provider failed because ${config.razorpayKeySecret} was rejected`)
    );

    await expect(
      service.initiatePayment('user-123', {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 499.99,
        currency: 'INR',
      })
    ).rejects.toMatchObject({
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
    });

    const serializedLogs = JSON.stringify(mocks.logger.error.mock.calls);
    expect(serializedLogs).not.toContain(config.razorpayKeySecret);
    expect(serializedLogs).toContain('[REDACTED]');
  });
});
