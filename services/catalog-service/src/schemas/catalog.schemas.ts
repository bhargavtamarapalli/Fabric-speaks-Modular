import { z } from 'zod';

export const CreateProductSchema = z.object({
    name: z.string().min(3).max(200),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    brandId: z.string().uuid(),
    categoryId: z.string().uuid(),
    description: z.string().optional(),
    fabric_details: z.string().optional(),
    care_guide: z.string().optional(),
    // USP Fields
    fabric_type: z.string().min(1),
    gsm_weight: z.number().int().positive(),
    weave_type: z.string().min(1),
    breathability_rating: z.string().min(1),
    care_instructions: z.string().min(1),
    fabric_origin: z.string().min(1),
    attributes: z.record(z.any()).default({}),
    manual_badges_json: z.array(z.object({ type: z.string() })).optional(),
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
