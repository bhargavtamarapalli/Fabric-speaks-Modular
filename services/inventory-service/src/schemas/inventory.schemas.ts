import { z } from 'zod';

export const ManualAdjustmentSchema = z.object({
  newQty: z.number().int().nonnegative({ message: 'Stock quantity cannot be negative' }),
  reason: z.string().min(1, { message: 'Reason is required for manual adjustment' })
});

export const BulkAdjustmentRowSchema = z.object({
  variant_id: z.string().uuid({ message: 'Invalid variant ID format' }),
  new_qty: z.coerce.number().int().nonnegative({ message: 'Invalid quantity' }),
  reason: z.string().min(1, { message: 'Reason is required' })
});

export const ExpectedArrivalSchema = z.object({
  variantId: z.string().uuid({ message: 'Invalid variant ID format' }),
  expectedQty: z.number().int().positive({ message: 'Expected quantity must be greater than zero' }),
  arrivalDate: z.string().datetime({ message: 'Invalid arrival date format' })
});

export type ManualAdjustmentInput = z.infer<typeof ManualAdjustmentSchema>;
export type ExpectedArrivalInput = z.infer<typeof ExpectedArrivalSchema>;
