import { z } from 'zod';

export const AdjustmentReasonSchema = z.enum([
  'damaged',
  'miscounted',
  'theft',
  'return_restocked',
  'supplier_short_shipped',
  'initial_stock',
  'correction',
  'other'
]);

export const ManualAdjustmentSchema = z.object({
  newQty: z.number().int().nonnegative({ message: 'Stock quantity cannot be negative' }),
  reason: AdjustmentReasonSchema
});

export const BulkAdjustmentRowSchema = z.object({
  variant_id: z.string().uuid({ message: 'Invalid variant ID format' }),
  new_qty: z.coerce.number().int().nonnegative({ message: 'Invalid quantity' }),
  reason: AdjustmentReasonSchema
});

export const ExpectedArrivalSchema = z.object({
  variant_id: z.string().uuid({ message: 'Invalid variant ID format' }),
  expected_qty: z.number().int().positive({ message: 'Expected quantity must be greater than zero' }),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date format (YYYY-MM-DD)' }),
  notes: z.string().max(500).optional()
});

export const UpdateThresholdSchema = z.object({
  threshold_qty: z.number().int().nonnegative({ message: 'Threshold must be non-negative' })
});

export type ManualAdjustmentInput = z.infer<typeof ManualAdjustmentSchema>;
export type ExpectedArrivalInput = z.infer<typeof ExpectedArrivalSchema>;
export type UpdateThresholdInput = z.infer<typeof UpdateThresholdSchema>;

export const IdParamSchema = z.object({ id: z.string().uuid() });
export const VariantIdParamSchema = z.object({ variantId: z.string().uuid() });
