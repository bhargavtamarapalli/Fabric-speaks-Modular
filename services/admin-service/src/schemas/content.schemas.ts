import { z } from 'zod';

export const BannerSchema = z.object({
  title: z.string().min(1).max(200),
  image_mobile_url: z.string().url(),
  image_desktop_url: z.string().url(),
  link_url: z.string().url().optional(),
  utm_params: z.string().optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  is_active: z.boolean().default(true)
});

export const UpdateBannerSchema = BannerSchema.partial();

export const BannerListQuerySchema = z.object({
  isActive: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : undefined, z.boolean().optional()),
  limit: z.preprocess((val) => Number(val), z.number().int().min(1).max(100).optional()),
  offset: z.preprocess((val) => Number(val), z.number().int().min(0).optional())
});

const SaleEventBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  discount_type: z.enum(['PERCENT', 'FIXED']),
  discount_value: z.number().positive(),
  scope: z.enum(['global', 'collection', 'specific_products']),
  scope_ids: z.array(z.string().uuid()).default([]),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  is_active: z.boolean().default(true)
});

export const SaleEventSchema = SaleEventBaseSchema.refine(data => new Date(data.starts_at) < new Date(data.ends_at), {
  message: "ends_at must be after starts_at",
  path: ["ends_at"]
});

export const UpdateSaleEventSchema = SaleEventBaseSchema.partial().refine(data => {
  if (data.starts_at && data.ends_at) {
    return new Date(data.starts_at) < new Date(data.ends_at);
  }
  return true;
}, {
  message: "ends_at must be after starts_at",
  path: ["ends_at"]
});

export type CreateBannerDto = z.infer<typeof BannerSchema>;
export type UpdateBannerDto = z.infer<typeof UpdateBannerSchema>;
export type BannerListQueryDto = z.infer<typeof BannerListQuerySchema>;
export type CreateSaleEventDto = z.infer<typeof SaleEventSchema>;
export type UpdateSaleEventDto = z.infer<typeof UpdateSaleEventSchema>;
