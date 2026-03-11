import { z } from 'zod';

export const InitiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('INR')
});

export const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string()
});

export const RefundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional()
});
