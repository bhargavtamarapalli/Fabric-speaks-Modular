import crypto from 'crypto';
import { AppError, ErrorCode } from '@fs/shared';
import {
  PAYMENT_EVENT,
  PAYMENT_METHOD_HINT,
  PAYMENT_STATUS,
  SUPPORTED_PAYMENT_CURRENCY,
} from '../constants/payment.constants';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import {
  PaymentRecord,
  PaymentRepository,
  UpdatePaymentInput,
} from '../repositories/payment.repository';
import {
  ConfirmCodInput,
  InitiatePaymentInput,
  RazorpayWebhookInput,
  RefundPaymentInput,
  VerifyPaymentInput,
} from '../schemas/payment.schemas';

interface PaymentLogger {
  info(payload: unknown, message?: string): void;
  warn(payload: unknown, message?: string): void;
  error(payload: unknown, message?: string): void;
}

interface PaymentEventQueue {
  add(name: string, payload: Record<string, unknown>): Promise<unknown>;
}

interface RazorpayOrderCreateOptions {
  amount: number;
  currency: string;
  receipt: string;
  notes: {
    userId: string;
    orderId: string;
  };
}

interface RazorpayOrderResponse {
  id: string;
  amount: string | number;
  currency: string;
  status?: string;
}

interface RazorpayRefundResponse {
  id: string;
}

interface RazorpayPaymentDetails {
  method?: string;
  card?: {
    last4?: string | null;
  } | null;
}

interface RazorpayClient {
  orders: {
    create(options: RazorpayOrderCreateOptions): Promise<RazorpayOrderResponse>;
  };
  payments: {
    fetch?(paymentId: string): Promise<RazorpayPaymentDetails>;
    refund(paymentId: string, options: { amount?: number; speed: 'normal' }): Promise<RazorpayRefundResponse>;
  };
}

interface PaymentConfig {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
}

export interface PaymentServiceDependencies {
  paymentRepo: PaymentRepository;
  auditLogRepo: AuditLogRepository;
  razorpayClient: RazorpayClient;
  eventQueue: PaymentEventQueue;
  logger: PaymentLogger;
  config: PaymentConfig;
}

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: {
        id?: string;
        order_id?: string;
        method?: string;
        error_description?: string | null;
        card?: {
          last4?: string | null;
        } | null;
      };
    };
  };
}

const isSignatureValid = (expectedSignature: string, actualSignature: string): boolean => {
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(actualSignature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const sanitizeProviderMessage = (message: string, config: PaymentConfig): string => {
  const secretsToRedact = [
    config.razorpayKeySecret,
    config.razorpayWebhookSecret,
  ].filter((value) => value.length > 0);

  return secretsToRedact.reduce(
    (safeMessage, secret) => safeMessage.split(secret).join('[REDACTED]'),
    message
  );
};

const serializePayment = (payment: PaymentRecord): Record<string, unknown> => ({
  orderId: payment.orderId,
  userId: payment.userId,
  razorpayOrderId: payment.razorpayOrderId,
  razorpayPaymentId: payment.razorpayPaymentId,
  status: payment.status,
  amount: payment.amount,
  currency: payment.currency,
  methodHint: payment.methodHint,
  failureReason: payment.failureReason,
  refundId: payment.refundId,
  refundAmount: payment.refundAmount,
  cardLast4: payment.cardLast4,
});

const parseWebhookEvent = (rawBody: string): RazorpayWebhookEvent => {
  try {
    return JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid webhook payload');
  }
};

const buildCapturedUpdate = (
  paymentId: string | null,
  methodHint?: string,
  cardLast4?: string | null
): UpdatePaymentInput => ({
  razorpayPaymentId: paymentId,
  status: PAYMENT_STATUS.captured,
  methodHint: methodHint ?? null,
  cardLast4: cardLast4 ?? null,
});

export class PaymentService {
  constructor(private readonly dependencies: PaymentServiceDependencies) {}

  async initiatePayment(userId: string, payload: InitiatePaymentInput): Promise<Record<string, unknown>> {
    const order = await this.dependencies.paymentRepo.getOrderPaymentContextForUser(payload.orderId, userId);

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    if (order.paymentMethod === 'COD') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'COD orders do not require Razorpay initiation');
    }

    if (Math.abs(order.totalAmount - payload.amount) > 0.01) {
      this.dependencies.logger.warn(
        {
          orderId: payload.orderId,
          userId,
          clientAmount: payload.amount,
          dbAmount: order.totalAmount,
        },
        'Client payment amount did not match the order total'
      );
    }

    try {
      const razorpayOrder = await this.dependencies.razorpayClient.orders.create({
        amount: Math.round(order.totalAmount * 100),
        currency: payload.currency,
        receipt: payload.orderId,
        notes: {
          userId,
          orderId: payload.orderId,
        },
      });

      await this.dependencies.paymentRepo.createPayment({
        orderId: payload.orderId,
        userId,
        razorpayOrderId: razorpayOrder.id,
        amount: order.totalAmount,
        currency: payload.currency,
        status: PAYMENT_STATUS.pending,
      });

      return {
        razorpayOrderId: razorpayOrder.id,
        amount: Number(razorpayOrder.amount),
        currency: razorpayOrder.currency,
        key: this.dependencies.config.razorpayKeyId,
      };
    } catch (error) {
      this.dependencies.logger.error(
        {
          orderId: payload.orderId,
          userId,
          provider: 'razorpay',
          message: sanitizeProviderMessage(getErrorMessage(error), this.dependencies.config),
        },
        'Failed to initiate payment'
      );
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Unable to initiate payment at the moment');
    }
  }

  async verifyPayment(payload: VerifyPaymentInput): Promise<PaymentRecord> {
    const existingPayment = await this.dependencies.paymentRepo.getPaymentByRazorpayOrderId(payload.razorpayOrderId);

    if (!existingPayment) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Payment record not found');
    }

    if (existingPayment.status === PAYMENT_STATUS.captured) {
      return existingPayment;
    }

    const signaturePayload = `${payload.razorpayOrderId}|${payload.razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.dependencies.config.razorpayKeySecret)
      .update(signaturePayload)
      .digest('hex');

    if (!isSignatureValid(expectedSignature, payload.razorpaySignature)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid payment signature');
    }

    const paymentDetails = await this.fetchPaymentDetails(payload.razorpayPaymentId);
    const updatedPayment = await this.dependencies.paymentRepo.updatePayment(
      payload.razorpayOrderId,
      buildCapturedUpdate(
        payload.razorpayPaymentId,
        paymentDetails?.method,
        paymentDetails?.card?.last4 ?? null
      )
    );

    if (!updatedPayment) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Payment record not found');
    }

    await this.dependencies.eventQueue.add(PAYMENT_EVENT.captured, {
      orderId: existingPayment.orderId,
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
    });

    return updatedPayment;
  }

  async confirmCod(userId: string, payload: ConfirmCodInput): Promise<Record<string, unknown>> {
    const order = await this.dependencies.paymentRepo.getOrderPaymentContextForUser(payload.orderId, userId);

    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    if (order.paymentMethod !== 'COD') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Only COD orders can be confirmed');
    }

    if (order.isCodConfirmed) {
      const existingPayment = await this.dependencies.paymentRepo.getPaymentByOrderIdForUser(payload.orderId, userId);
      return {
        orderId: payload.orderId,
        isCodConfirmed: true,
        paymentStatus: existingPayment?.status ?? PAYMENT_STATUS.pending,
      };
    }

    const confirmedOrder = await this.dependencies.paymentRepo.markCodConfirmed(payload.orderId, userId);
    const orderForPayment = confirmedOrder ?? order;
    const existingPayment = await this.dependencies.paymentRepo.getPaymentByOrderIdForUser(payload.orderId, userId);

    if (existingPayment) {
      await this.dependencies.paymentRepo.updatePaymentByOrderId(payload.orderId, {
        status: existingPayment.status,
        methodHint: existingPayment.methodHint ?? PAYMENT_METHOD_HINT.cod,
      });
    } else {
      await this.dependencies.paymentRepo.createPayment({
        orderId: payload.orderId,
        userId,
        amount: orderForPayment.totalAmount,
        currency: SUPPORTED_PAYMENT_CURRENCY,
        status: PAYMENT_STATUS.pending,
        methodHint: PAYMENT_METHOD_HINT.cod,
      });
    }

    await this.dependencies.eventQueue.add(PAYMENT_EVENT.codConfirmed, {
      userId,
      orderId: payload.orderId,
    });

    return {
      orderId: payload.orderId,
      isCodConfirmed: true,
      paymentStatus: PAYMENT_STATUS.pending,
    };
  }

  async getPaymentStatus(userId: string, orderId: string): Promise<PaymentRecord> {
    const payment = await this.dependencies.paymentRepo.getPaymentByOrderIdForUser(orderId, userId);

    if (!payment) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Payment not found');
    }

    return payment;
  }

  async handleWebhook(payload: RazorpayWebhookInput): Promise<Record<string, unknown>> {
    const expectedSignature = crypto
      .createHmac('sha256', this.dependencies.config.razorpayWebhookSecret)
      .update(payload.rawBody)
      .digest('hex');

    if (!isSignatureValid(expectedSignature, payload.signature)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid webhook signature');
    }

    const event = parseWebhookEvent(payload.rawBody);
    const entity = event.payload.payment.entity;

    if (!entity.order_id) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Webhook payload is missing the Razorpay order id');
    }

    const existingPayment = await this.dependencies.paymentRepo.getPaymentByRazorpayOrderId(entity.order_id);

    if (!existingPayment) {
      this.dependencies.logger.warn(
        {
          razorpayOrderId: entity.order_id,
          event: event.event,
        },
        'Ignoring webhook for an unknown payment'
      );
      return { acknowledged: true, processed: false };
    }

    if (event.event === PAYMENT_EVENT.failed) {
      if (existingPayment.status === PAYMENT_STATUS.failed) {
        return { acknowledged: true, processed: false };
      }

      await this.dependencies.paymentRepo.updatePayment(entity.order_id, {
        razorpayPaymentId: entity.id ?? existingPayment.razorpayPaymentId,
        status: PAYMENT_STATUS.failed,
        methodHint: entity.method ?? existingPayment.methodHint,
        failureReason: entity.error_description ?? 'Payment failed',
        cardLast4: entity.card?.last4 ?? existingPayment.cardLast4,
      });

      await this.dependencies.eventQueue.add(PAYMENT_EVENT.failed, {
        orderId: existingPayment.orderId,
        razorpayOrderId: entity.order_id,
        razorpayPaymentId: entity.id ?? null,
        reason: entity.error_description ?? 'Payment failed',
      });

      return { acknowledged: true, processed: true, event: PAYMENT_EVENT.failed };
    }

    if (event.event === PAYMENT_EVENT.captured) {
      if (existingPayment.status === PAYMENT_STATUS.captured) {
        return { acknowledged: true, processed: false };
      }

      await this.dependencies.paymentRepo.updatePayment(
        entity.order_id,
        buildCapturedUpdate(entity.id ?? existingPayment.razorpayPaymentId, entity.method, entity.card?.last4)
      );

      await this.dependencies.eventQueue.add(PAYMENT_EVENT.captured, {
        orderId: existingPayment.orderId,
        razorpayOrderId: entity.order_id,
        razorpayPaymentId: entity.id ?? existingPayment.razorpayPaymentId,
      });

      return { acknowledged: true, processed: true, event: PAYMENT_EVENT.captured };
    }

    return { acknowledged: true, processed: false };
  }

  async refundPayment(
    adminId: string,
    orderId: string,
    payload: RefundPaymentInput
  ): Promise<PaymentRecord> {
    const payment = await this.dependencies.paymentRepo.getPaymentByOrderId(orderId);

    if (!payment || payment.status !== PAYMENT_STATUS.captured || !payment.razorpayPaymentId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Payment not refundable');
    }

    const refundAmount = payload.amount ?? payment.amount;

    try {
      const refund = await this.dependencies.razorpayClient.payments.refund(payment.razorpayPaymentId, {
        amount: payload.amount ? Math.round(payload.amount * 100) : undefined,
        speed: 'normal',
      });

      const updatedPayment = payment.razorpayOrderId
        ? await this.dependencies.paymentRepo.updatePayment(payment.razorpayOrderId, {
            status: PAYMENT_STATUS.refunded,
            refundId: refund.id,
            refundAmount,
          })
        : await this.dependencies.paymentRepo.updatePaymentByOrderId(orderId, {
            status: PAYMENT_STATUS.refunded,
            refundId: refund.id,
            refundAmount,
          });

      if (!updatedPayment) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Payment record not found');
      }

      await this.dependencies.auditLogRepo.insert({
        adminId,
        action: 'PAYMENT_REFUND',
        entityType: 'PAYMENT',
        entityId: payment.id,
        beforeJson: serializePayment(payment),
        afterJson: {
          ...serializePayment(updatedPayment),
          reason: payload.reason ?? null,
        },
      });

      return updatedPayment;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      this.dependencies.logger.error(
        {
          orderId,
          paymentId: payment.id,
          provider: 'razorpay',
          message: sanitizeProviderMessage(getErrorMessage(error), this.dependencies.config),
        },
        'Failed to refund payment'
      );
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Unable to process the refund at the moment');
    }
  }

  private async fetchPaymentDetails(paymentId: string): Promise<RazorpayPaymentDetails | null> {
    if (!this.dependencies.razorpayClient.payments.fetch) {
      return null;
    }

    try {
      return await this.dependencies.razorpayClient.payments.fetch(paymentId);
    } catch (error) {
      this.dependencies.logger.warn(
        {
          paymentId,
          provider: 'razorpay',
          message: sanitizeProviderMessage(getErrorMessage(error), this.dependencies.config),
        },
        'Unable to fetch payment metadata from Razorpay'
      );
      return null;
    }
  }
}
