import { z } from 'zod';

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
    attributes: z.record(z.any()).default({}),
    manualBadgesJson: z.array(z.object({ type: z.string() })).optional(),
});

export const CreateBrandSchema = z.object({
    name: z.string().min(2).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    story: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.string().length(0)),
});

export const CreateCollectionSchema = z.object({
    name: z.string().min(2).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(['smart', 'manual']),
    rules_json: z.record(z.any()).optional(),
    heroImageMobileUrl: z.string().url().optional().or(z.string().length(0)),
    heroImageDesktopUrl: z.string().url().optional().or(z.string().length(0)),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});

export const BulkUploadRequestSchema = z.object({
    csvData: z.string().min(1),
});

export const UpdateProductSchema = CreateProductSchema.partial();
export const DeactivateProductSchema = z.object({ confirm: z.boolean() });

export const AdminProductQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    'filter[is_active]': z.enum(['true', 'false']).optional(),
    'filter[brand_id]': z.string().uuid().optional(),
    'filter[has_sale]': z.enum(['true', 'false']).optional()
});

export const CreateCategorySchema = z.object({
    name: z.string().min(2).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    imageUrl: z.string().url().optional().or(z.string().length(0)),
    isActive: z.boolean().default(true)
});

export const UpdateCategorySchema = CreateCategorySchema.partial();
export const UpdateCollectionSchema = CreateCollectionSchema.partial();

export type AdminProductQueryDto = z.infer<typeof AdminProductQuerySchema>;
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
export type UpdateCollectionDto = z.infer<typeof UpdateCollectionSchema>;

export const BulkUploadSchema = z.array(z.object({
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
}));

export const ProductQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
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
