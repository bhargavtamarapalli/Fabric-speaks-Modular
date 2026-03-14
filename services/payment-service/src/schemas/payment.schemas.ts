import { z } from 'zod';

export const InitiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('INR')
});

export const VerifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string()
});

export const RefundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional()
});
