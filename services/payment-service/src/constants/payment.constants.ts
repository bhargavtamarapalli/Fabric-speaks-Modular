export const PAYMENT_EVENT_QUEUE_NAME = 'payment-events';

export const PAYMENT_STATUS = {
  pending: 'PENDING',
  captured: 'CAPTURED',
  failed: 'FAILED',
  refunded: 'REFUNDED',
  partiallyRefunded: 'PARTIALLY_REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_METHOD_HINT = {
  cod: 'cod',
} as const;

export const PAYMENT_EVENT = {
  captured: 'payment.captured',
  failed: 'payment.failed',
  codConfirmed: 'payment.cod_confirmed',
  refundProcessed: 'refund.processed',
} as const;

export type PaymentEventName = (typeof PAYMENT_EVENT)[keyof typeof PAYMENT_EVENT];

export const SUPPORTED_PAYMENT_CURRENCY = 'INR';
