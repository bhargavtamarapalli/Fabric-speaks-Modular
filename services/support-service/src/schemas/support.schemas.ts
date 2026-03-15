import { z } from 'zod';
import { MobileSchema, PaginationSchema } from '@fs/shared/schemas';

export const SupportQueueQuerySchema = PaginationSchema.extend({
  'filter[status]': z.enum(['open', 'in_progress', 'resolved']).optional(),
  'filter[priority]': z.enum(['P0', 'P1', 'P2']).optional(),
});
export type SupportQueueQueryDto = z.infer<typeof SupportQueueQuerySchema>;

export const UpdateQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
  note: z.string().max(1000).optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional(),
}).refine(d => d.status || d.note || d.priority, 'At least one field required');
export type UpdateQueryDto = z.infer<typeof UpdateQuerySchema>;

// SUP-04 Customer Lookup validation
export const CustomerLookupParamSchema = z.object({
  mobile: z.string().min(4).max(10), // Last 4 digits or full mobile
});
export type CustomerLookupParamDto = z.infer<typeof CustomerLookupParamSchema>;

export const CaseIdParamSchema = z.object({ caseId: z.string().uuid() });
