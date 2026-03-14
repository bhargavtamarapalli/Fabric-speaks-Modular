import { z } from 'zod';
import { uuidSchema } from '@fs/shared';

const NavItemSchema = z.object({
  id: uuidSchema.optional(), // omit for new items
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

// Note: Config updates for homepage are partially nested so we allow a loose

const BaseSectionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  isVisible: z.boolean().default(true),
  order: z.number().int()
});

const HomepageSectionSchema = z.discriminatedUnion('type', [
  BaseSectionSchema.extend({
    type: z.literal('hero'),
    data: z.object({
      imageUrl: z.string().url(),
      title: z.string(),
      description: z.string().optional(),
      cta: z.object({ text: z.string(), link: z.string() }).optional()
    })
  }),
  BaseSectionSchema.extend({
    type: z.literal('grid'),
    data: z.object({
      items: z.array(z.object({
        imageUrl: z.string().url(),
        link: z.string(),
        title: z.string().optional()
      }))
    })
  }),
  BaseSectionSchema.extend({
    type: z.literal('carousel'),
    data: z.object({
      slides: z.array(z.object({
        imageUrl: z.string().url(),
        link: z.string()
      }))
    })
  }),
  BaseSectionSchema.extend({
    type: z.literal('banner'),
    data: z.object({
      imageUrl: z.string().url(),
      link: z.string()
    })
  })
]);

export const UpdateHomepageConfigSchema = z.object({
  sections: z.array(HomepageSectionSchema)
});

export type UpdateHomepageConfigDto = z.infer<typeof UpdateHomepageConfigSchema>;

export const UpdateNavigationConfigSchema = z.object({
  links: z.array(z.object({
    label: z.string(),
    href: z.string(),
    icon: z.string().optional(),
    children: z.array(z.object({
      label: z.string(),
      href: z.string()
    })).optional()
  }))
});

export type UpdateNavigationConfigDto = z.infer<typeof UpdateNavigationConfigSchema>;
