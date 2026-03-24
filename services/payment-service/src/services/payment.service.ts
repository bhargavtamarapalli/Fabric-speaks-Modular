import crypto from 'crypto';
import { AppError, ErrorCode, withExternalRetry } from '@fs/shared';
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
    payment?: {
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
    refund?: {
      entity: {
        id?: string;
        payment_id?: string;
        amount?: number;
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

const resolveRefundStatus = (paymentAmount: number, refundAmount: number) =>
  refundAmount < paymentAmount ? PAYMENT_STATUS.partiallyRefunded : PAYMENT_STATUS.refunded;

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
      const razorpayOrder = await withExternalRetry(
        () => this.dependencies.razorpayClient.orders.create({
          amount: Math.round(order.totalAmount * 100),
          currency: payload.currency,
          receipt: payload.orderId,
          notes: {
            userId,
            orderId: payload.orderId,
          },
        }),
        {
          method: 'POST',
          idempotent: false,
          retryOnNetworkError: true,
          operation: 'razorpay.order.create'
        }
      );

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
    const updatedPayment = await this.dependencies.paymentRepo.capturePaymentIfPending(
      payload.razorpayOrderId,
      buildCapturedUpdate(
        payload.razorpayPaymentId,
        paymentDetails?.method,
        paymentDetails?.card?.last4 ?? null
      )
    );

    if (!updatedPayment) {
      const latestPayment = await this.dependencies.paymentRepo.getPaymentByRazorpayOrderId(payload.razorpayOrderId);
      if (latestPayment?.status === PAYMENT_STATUS.captured) {
        return latestPayment;
      }
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
    const paymentEntity = event.payload.payment?.entity;
    const refundEntity = event.payload.refund?.entity;

    if (event.event === PAYMENT_EVENT.failed) {
      if (!paymentEntity?.order_id) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Webhook payload is missing the Razorpay order id');
      }

      const existingPayment = await this.dependencies.paymentRepo.getPaymentByRazorpayOrderId(paymentEntity.order_id);

      if (!existingPayment) {
        this.dependencies.logger.warn(
          {
            razorpayOrderId: paymentEntity.order_id,
            event: event.event,
          },
          'Ignoring webhook for an unknown payment'
        );
        return { acknowledged: true, processed: false };
      }

      if (existingPayment.status === PAYMENT_STATUS.failed || existingPayment.status === PAYMENT_STATUS.captured) {
        return { acknowledged: true, processed: false };
      }

      const failedPayment = await this.dependencies.paymentRepo.failPaymentIfPending(paymentEntity.order_id, {
        razorpayPaymentId: paymentEntity.id ?? existingPayment.razorpayPaymentId,
        status: PAYMENT_STATUS.failed,
        methodHint: paymentEntity.method ?? existingPayment.methodHint,
        failureReason: paymentEntity.error_description ?? 'Payment failed',
        cardLast4: paymentEntity.card?.last4 ?? existingPayment.cardLast4,
      });

      if (!failedPayment) {
        return { acknowledged: true, processed: false };
      }

      await this.dependencies.eventQueue.add(PAYMENT_EVENT.failed, {
        orderId: existingPayment.orderId,
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id ?? null,
        reason: paymentEntity.error_description ?? 'Payment failed',
      });

      return { acknowledged: true, processed: true, event: PAYMENT_EVENT.failed };
    }

    if (event.event === PAYMENT_EVENT.captured) {
      if (!paymentEntity?.order_id) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Webhook payload is missing the Razorpay order id');
      }

      const existingPayment = await this.dependencies.paymentRepo.getPaymentByRazorpayOrderId(paymentEntity.order_id);

      if (!existingPayment) {
        this.dependencies.logger.warn(
          {
            razorpayOrderId: paymentEntity.order_id,
            event: event.event,
          },
          'Ignoring webhook for an unknown payment'
        );
        return { acknowledged: true, processed: false };
      }

      if (existingPayment.status === PAYMENT_STATUS.captured) {
        return { acknowledged: true, processed: false };
      }

      const capturedPayment = await this.dependencies.paymentRepo.capturePaymentIfPending(
        paymentEntity.order_id,
        buildCapturedUpdate(paymentEntity.id ?? existingPayment.razorpayPaymentId, paymentEntity.method, paymentEntity.card?.last4)
      );

      if (!capturedPayment) {
        return { acknowledged: true, processed: false };
      }

      await this.dependencies.eventQueue.add(PAYMENT_EVENT.captured, {
        orderId: existingPayment.orderId,
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id ?? existingPayment.razorpayPaymentId,
      });

      return { acknowledged: true, processed: true, event: PAYMENT_EVENT.captured };
    }

    if (event.event === PAYMENT_EVENT.refundProcessed) {
      if (!refundEntity?.payment_id || refundEntity.amount === undefined || !refundEntity.id) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Webhook payload is missing refund details');
      }

      const existingPayment = await this.dependencies.paymentRepo.getPaymentByRazorpayPaymentId(refundEntity.payment_id);

      if (!existingPayment) {
        this.dependencies.logger.warn(
          {
            razorpayPaymentId: refundEntity.payment_id,
            event: event.event,
          },
          'Ignoring refund webhook for an unknown payment'
        );
        return { acknowledged: true, processed: false };
      }

      const refundAmount = Number(refundEntity.amount) / 100;
      const nextStatus = resolveRefundStatus(existingPayment.amount, refundAmount);

      if (existingPayment.refundId === refundEntity.id && existingPayment.refundAmount === refundAmount) {
        return { acknowledged: true, processed: false };
      }

      const updatedPayment = existingPayment.razorpayOrderId
        ? await this.dependencies.paymentRepo.updatePayment(existingPayment.razorpayOrderId, {
            status: nextStatus,
            refundId: refundEntity.id,
            refundAmount,
          })
        : await this.dependencies.paymentRepo.updatePaymentByOrderId(existingPayment.orderId, {
            status: nextStatus,
            refundId: refundEntity.id,
            refundAmount,
          });

      return {
        acknowledged: true,
        processed: Boolean(updatedPayment),
        event: PAYMENT_EVENT.refundProcessed,
      };
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

    if (refundAmount > payment.amount) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Refund amount cannot exceed the captured payment amount');
    }

    const nextStatus = resolveRefundStatus(payment.amount, refundAmount);

    try {
      const refund = await withExternalRetry(
        () => this.dependencies.razorpayClient.payments.refund(payment.razorpayPaymentId as string, {
          amount: payload.amount ? Math.round(payload.amount * 100) : undefined,
          speed: 'normal',
        }),
        {
          method: 'POST',
          idempotent: false,
          retryOnNetworkError: true,
          operation: 'razorpay.payment.refund'
        }
      );

      const updatedPayment = payment.razorpayOrderId
        ? await this.dependencies.paymentRepo.updatePayment(payment.razorpayOrderId, {
            status: nextStatus,
            refundId: refund.id,
            refundAmount,
          })
        : await this.dependencies.paymentRepo.updatePaymentByOrderId(orderId, {
            status: nextStatus,
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
      return await withExternalRetry(
        () => this.dependencies.razorpayClient.payments.fetch!(paymentId),
        {
          method: 'GET',
          idempotent: true,
          operation: 'razorpay.payment.fetch'
        }
      );
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
