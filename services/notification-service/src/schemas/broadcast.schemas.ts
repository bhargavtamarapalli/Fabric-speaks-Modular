import { z } from 'zod';

export const AudienceFilterSchema = z.object({
  fabricTypes: z.array(z.string().min(1)).optional(),
  minOrders: z.coerce.number().int().min(1).optional(),
  lastOrderSinceDays: z.coerce.number().int().min(1).optional()
}).default({});

export const BroadcastEstimateSchema = z.object({
  audience: AudienceFilterSchema
});

export const BroadcastCampaignSchema = z.object({
  templateId: z.string().min(1),
  messagePreview: z.string().min(1).max(1000),
  scheduledAt: z.string().datetime().optional(),
  templateComponents: z.array(z.any()).optional(),
  channel: z.enum(['whatsapp']).default('whatsapp'),
  audience: AudienceFilterSchema
});

export const BroadcastCampaignListSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const TemplateListSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'disabled']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const TemplatePreviewSchema = z.object({
  templateId: z.string().min(1),
  variables: z.array(z.string()).optional()
});

export type BroadcastEstimateDto = z.infer<typeof BroadcastEstimateSchema>;
export type BroadcastCampaignDto = z.infer<typeof BroadcastCampaignSchema>;
export type BroadcastCampaignListDto = z.infer<typeof BroadcastCampaignListSchema>;
export type TemplateListDto = z.infer<typeof TemplateListSchema>;
export type TemplatePreviewDto = z.infer<typeof TemplatePreviewSchema>;
