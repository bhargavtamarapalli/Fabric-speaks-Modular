import { z } from 'zod';

export const VariantItemSchema = z.object({
  sku: z.string().min(1).max(100),
  size: z.string().max(20).optional(),
  colour: z.string().max(50).optional(),
  sizeLabel: z.string().max(30).optional(),
  basePrice: z.number().positive(),
  priceOverride: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  saleActive: z.boolean().default(false),
  qty: z.number().int().nonnegative(),
  badges: z.record(z.unknown()).optional(),
  images: z.array(z.union([z.string().url(), z.record(z.unknown())])).default([]),
  isActive: z.boolean().default(true),
});

const CreateVariantSchemaBase = z.object({
  size: z.string().min(1).max(20),
  colour: z.string().min(1).max(50),
  sizeLabel: z.string().min(1).max(30),
  basePrice: z.number().positive(),
  priceOverride: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  saleActive: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().max(200).optional(),
        order: z.number().int().min(0),
      })
    )
    .max(8)
    .optional(),
});

export const CreateVariantSchema = CreateVariantSchemaBase.refine(
  (data) => !data.saleActive || Boolean(data.salePrice),
  {
    message: 'salePrice required when saleActive=true',
    path: ['salePrice'],
  }
);

export const UpdateVariantSchema = CreateVariantSchemaBase.omit({
  size: true,
  colour: true,
})
  .partial()
  .refine(
    (data: Record<string, unknown>) => Object.keys(data).length > 0,
    'At least one field must be provided for update'
  );

export const CreateProductSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  description: z.string().optional(),
  fabricDetails: z.string().optional(),
  careGuide: z.string().optional(),
  // USP Fields
  fabricType: z.string().min(1),
  gsmWeight: z.number().int().positive(),
  weaveType: z.string().min(1),
  breathabilityRating: z.string().min(1),
  careInstructions: z.string().min(1),
  fabricOrigin: z.string().min(1),
  attributes: z.record(z.unknown()).default({}),
  manualBadgesJson: z.array(z.object({ type: z.string() })).optional(),
  variants: z.array(VariantItemSchema).min(1),
});

export const CreateBrandSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  story: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.string().length(0)),
});

export const UpdateBrandSchema = CreateBrandSchema.partial()
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided for update')
  .and(
    z
      .object({
        isActive: z.boolean().optional(),
      })
      .partial()
  );

export const CreateCollectionSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(['smart', 'manual']),
  rules_json: z.record(z.unknown()).optional(),
  heroImageMobileUrl: z.string().url().optional().or(z.string().length(0)),
  heroImageDesktopUrl: z.string().url().optional().or(z.string().length(0)),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const BulkUploadRequestSchema = z.object({
  csvData: z.string().min(1),
  dryRun: z.boolean().optional(),
});

export const BulkUpdateVariantItemSchema = z
  .object({
    variantId: z.string().uuid(),
    size: z.string().max(20).optional(),
    colour: z.string().max(50).optional(),
    sizeLabel: z.string().max(30).optional(),
    basePrice: z.number().positive().optional(),
    priceOverride: z.number().positive().optional(),
    salePrice: z.number().positive().optional(),
    saleActive: z.boolean().optional(),
    qty: z.number().int().nonnegative().optional(),
    badges: z.record(z.unknown()).optional(),
    images: z.array(z.union([z.string().url(), z.record(z.unknown())])).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).some((key) => key !== 'variantId'),
    'At least one field must be provided for update'
  );

export const BulkUpdateVariantsSchema = z.object({
  variants: z.array(BulkUpdateVariantItemSchema).min(1),
});

export const UpdateProductSchema = CreateProductSchema.omit({ variants: true }).partial();
export const DeactivateProductSchema = z.object({ confirm: z.boolean() });
export const IdParamSchema = z.object({ id: z.string().uuid() });
export const VariantIdParamSchema = z.object({ variantId: z.string().uuid() });

export const AdminProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  'filter[is_active]': z.enum(['true', 'false']).optional(),
  'filter[brand_id]': z.string().uuid().optional(),
  'filter[has_sale]': z.enum(['true', 'false']).optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional().or(z.string().length(0)),
  isActive: z.boolean().default(true),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();
export const UpdateCollectionSchema = CreateCollectionSchema.partial();
export const ReorderCollectionProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

export const AddCollectionProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

export const BulkPriceUpdateBaseSchema = z.object({
  targetType: z.enum(['product', 'variant', 'collection', 'brand', 'global']),
  targetIds: z.array(z.string().uuid()).optional().default([]),
  adjustmentType: z.enum(['PERCENT', 'FIXED']),
  adjustmentValue: z.number().min(-1000).max(1000),
  applyTo: z.enum(['base_price', 'price_override']).default('base_price'),
  dryRun: z.boolean().optional(),
});

export const BulkPriceUpdateSchema = BulkPriceUpdateBaseSchema.refine(
  (data) => {
    if (data.targetType === 'global') return true;
    return data.targetIds.length > 0;
  },
  {
    message: 'targetIds required for non-global bulk updates',
    path: ['targetIds'],
  }
);

export const SchedulePriceChangeSchema = BulkPriceUpdateBaseSchema.extend({
  scheduledAt: z.string().datetime(),
});

export const CreateVariantTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  sizes: z.array(z.string()).min(1),
  colours: z.array(z.string()).min(1),
});

export const PriceChangeListQuerySchema = z.object({
  status: z.enum(['scheduled', 'processing', 'applied', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AdminProductQueryDto = z.infer<typeof AdminProductQuerySchema>;
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
export type UpdateCollectionDto = z.infer<typeof UpdateCollectionSchema>;
export type UpdateBrandDto = z.infer<typeof UpdateBrandSchema>;
export type BulkPriceUpdateDto = z.infer<typeof BulkPriceUpdateSchema>;
export type SchedulePriceChangeDto = z.infer<typeof SchedulePriceChangeSchema>;
export type PriceChangeListQueryDto = z.infer<typeof PriceChangeListQuerySchema>;
export type CreateVariantTemplateDto = z.infer<typeof CreateVariantTemplateSchema>;

export const VariantTemplateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type VariantTemplateQueryDto = z.infer<typeof VariantTemplateQuerySchema>;

export const BulkUploadSchema = z.array(
  z.object({
    name: z.string().min(1, 'Product name required'),
    sku: z.string().min(1, 'SKU required'),
    size: z.string().optional(),
    colour: z.string().optional(),
    base_price: z.number().positive('Price must be positive'),
    qty: z.number().int().nonnegative('Quantity cannot be negative'),
    // CRITICAL: All 6 fabric fields REQUIRED (USP fields per RULE)
    fabric_type: z.string().min(1, 'Fabric type required'),
    gsm_weight: z.number().positive('GSM weight must be positive'),
    weave_type: z.string().min(1, 'Weave type required'),
    breathability_rating: z.string().min(1, 'Breathability rating required'),
    care_instructions: z.string().min(1, 'Care instructions required'),
    fabric_origin: z.string().min(1, 'Fabric origin required'),
  })
);

export const ProductQuerySchema = z.object({
  cursor: z.string().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(24),
  search: z.string().optional(),
  fabric: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  colour: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type ProductQueryDto = z.infer<typeof ProductQuerySchema>;
export type CreateBrandDto = z.infer<typeof CreateBrandSchema>;
export type CreateCollectionDto = z.infer<typeof CreateCollectionSchema>;
export type BulkUploadRequestDto = z.infer<typeof BulkUploadRequestSchema>;
export type VariantItemDto = z.infer<typeof VariantItemSchema>;
export type BulkUpdateVariantItemDto = z.infer<typeof BulkUpdateVariantItemSchema>;
export type BulkUpdateVariantsDto = z.infer<typeof BulkUpdateVariantsSchema>;
export type CreateVariantInputDto = z.infer<typeof CreateVariantSchema>;
export type UpdateVariantInputDto = z.infer<typeof UpdateVariantSchema>;
