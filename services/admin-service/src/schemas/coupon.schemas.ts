import { z } from 'zod';
import { paginationSchema } from '@fs/shared';

export const CreateCouponSchema = z.object({
  code: z.string().min(3).max(50).transform(s => s.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]+$/)),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().positive(),
  maxDiscount: z.number().positive().optional(),
  minOrderAmount: z.number().min(0).default(0),
  maxUsesTotal: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().min(1).default(1),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
}).refine(d => new Date(d.validFrom) < new Date(d.validUntil), {
  message: 'validFrom must be before validUntil',
  path: ['validUntil']
});

export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;

export const UpdateCouponSchema = z.object({
  isActive: z.boolean().optional(),
  validUntil: z.string().datetime().optional(),
  maxUsesTotal: z.number().int().positive().optional(),
});

export type UpdateCouponDto = z.infer<typeof UpdateCouponSchema>;

export const CouponListQuerySchema = paginationSchema.extend({
  'filter[is_active]': z.coerce.boolean().optional(),
  'filter[discount_type]': z.enum(['PERCENT', 'FIXED']).optional(),
});

export type CouponListQueryDto = z.infer<typeof CouponListQuerySchema>;
