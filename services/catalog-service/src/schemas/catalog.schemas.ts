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

export const BulkUploadSchema = z.array(z.object({
    name: z.string(),
    sku: z.string(),
    size: z.string().optional(),
    colour: z.string().optional(),
    base_price: z.number().positive(),
    qty: z.number().int().nonnegative(),
    // Fabric USP fields can be at variant level if they vary, but usually product level.
    // LLD says variants belong to products.
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
