import { z } from 'zod';
import { PaginationSchema, SlugSchema, UuidSchema } from '@fs/shared/schemas';

export const CreatePageSchema = z.object({
  title: z.string().min(3).max(200),
  slug: SlugSchema.optional(),
  bodyHtml: z.string().max(100000), // sanitised on save
  heroImageUrl: z.string().url().optional(),
  relatedProductIds: z.array(UuidSchema).max(6).optional(),
  seoMeta: z.object({ title: z.string(), description: z.string() }).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export type CreatePageDto = z.infer<typeof CreatePageSchema>;

export const UpdatePageSchema = CreatePageSchema.partial();
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>;

export const PageListQuerySchema = PaginationSchema.extend({
  'filter[status]': z.enum(['draft', 'published', 'archived']).optional()
});

export type PageListQueryDto = z.infer<typeof PageListQuerySchema>;
