import { z } from 'zod';
import { SUPPORTED_PAYMENT_CURRENCY } from '../constants/payment.constants';

export const InitiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default(SUPPORTED_PAYMENT_CURRENCY),
});

export type InitiatePaymentInput = z.infer<typeof InitiatePaymentSchema>;

export const VerifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;

export const ConfirmCodSchema = z.object({
  orderId: z.string().uuid(),
});

export type ConfirmCodInput = z.infer<typeof ConfirmCodSchema>;

export const PaymentStatusParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export type PaymentStatusParams = z.infer<typeof PaymentStatusParamsSchema>;

export const RefundPaymentParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export type RefundPaymentParams = z.infer<typeof RefundPaymentParamsSchema>;

export const RefundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;

export const RazorpayWebhookSchema = z.object({
  signature: z.string().min(1),
  rawBody: z.string().min(1),
});

export type RazorpayWebhookInput = z.infer<typeof RazorpayWebhookSchema>;
