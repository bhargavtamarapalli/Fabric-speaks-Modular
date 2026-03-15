import { z } from 'zod';
import { paginationSchema, uuidSchema } from '@fs/shared';

const slugSchema = z.string().regex(/^[a-z0-9-]+$/);
const ContentStatusSchema = z.enum(['draft', 'published', 'archived']);

export const CreatePageSchema = z.object({
  title: z.string().min(3).max(200),
  slug: slugSchema.optional(),
  content: z.string().max(100000), // sanitised on save
  heroImageUrl: z.string().url().optional(),
  relatedProductIds: z.array(uuidSchema).max(6).optional(),
  seoMeta: z.object({ title: z.string(), description: z.string() }).optional(),
  status: ContentStatusSchema.default('draft'),
});

export type CreatePageDto = z.infer<typeof CreatePageSchema>;

export const UpdatePageSchema = CreatePageSchema.partial();
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>;

export const PageListQuerySchema = paginationSchema.extend({
  'filter[is_active]': z.coerce.boolean().optional(),
  'filter[status]': ContentStatusSchema.optional(),
});

export type PageListQueryDto = z.infer<typeof PageListQuerySchema>;
