import { z } from 'zod';

export const AddCartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(10), // Limit 10 items per variant
});

export const UpdateCartItemQtySchema = z.object({
  quantity: z.number().int().positive().max(10),
});

export const ApplyCouponSchema = z.object({
  code: z.string().min(3).max(50),
});

export const MergeCartSchema = z.object({
  guestSessionId: z.string().min(10),
});

export type AddCartItemDto = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemQtyDto = z.infer<typeof UpdateCartItemQtySchema>;
export type ApplyCouponDto = z.infer<typeof ApplyCouponSchema>;
export type MergeCartDto = z.infer<typeof MergeCartSchema>;
