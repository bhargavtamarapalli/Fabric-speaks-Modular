import { z } from 'zod';
import { UuidSchema } from '@fs/shared/schemas';

const NavItemSchema = z.object({
  id: UuidSchema.optional(), // omit for new items
  label: z.string().min(1).max(50),
  type: z.enum(['category', 'collection', 'url']),
  targetSlug: z.string(),
  displayOrder: z.number().int().min(0),
  highlightColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

export const UpdateNavSchema = z.object({
  items: z.array(NavItemSchema).min(1).max(20),
});

export type UpdateNavDto = z.infer<typeof UpdateNavSchema>;

// Note: Config updates for homepage are partially nested so we allow a loose partial for the JSON
export const UpdateHomepageConfigSchema = z.record(z.any()); // Simplification: any section patch allowed
export type UpdateHomepageConfigDto = z.infer<typeof UpdateHomepageConfigSchema>;
