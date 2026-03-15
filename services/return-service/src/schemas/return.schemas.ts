import { z } from 'zod';
import { uuidSchema } from '@fs/shared';

export const returnStatusSchema = z.enum([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'INSPECTED',
  'COMPLETED',
  'FAST_TRACKED'
]);

export const returnTypeSchema = z.enum([
  'WRONG_ITEM',
  'DAMAGED',
  'SIZE_EXCHANGE',
  'CHANGED_MIND',
  'OTHER'
]);

export const initiateReturnItemSchema = z.object({
  orderItemId: uuidSchema,
  variantId: uuidSchema,
  quantity: z.number().int().positive(),
  refundAmount: z.number().optional()
});

export const initiateReturnSchema = z.object({
  returnType: returnTypeSchema,
  items: z.array(initiateReturnItemSchema).min(1, 'At least one item must be returned'),
  isFastTrack: z.boolean().optional().default(false)
});

export const updateStatusSchema = z.object({
  status: returnStatusSchema,
  agentNotes: z.string().optional()
});

export const resolveReturnSchema = z.object({
  resolution: z.enum(['REFUND', 'REPLACEMENT']),
  agentNotes: z.string().optional()
});

export const listReturnsQuerySchema = z.object({
  status: returnStatusSchema.optional(),
  userId: uuidSchema.optional()
});

export const returnIdParamSchema = z.object({
  returnId: uuidSchema,
});

export type InitiateReturnInput = z.infer<typeof initiateReturnSchema>;
export type UpdateReturnStatusInput = z.infer<typeof updateStatusSchema>;
export type ResolveReturnInput = z.infer<typeof resolveReturnSchema>;
