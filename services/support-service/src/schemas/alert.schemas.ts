import { z } from 'zod';

export const ReturnPickupFailedSchema = z.object({
  orderId: z.string().uuid(),
  returnId: z.string().optional(),
  reason: z.string().optional()
});

export type ReturnPickupFailedEvent = z.infer<typeof ReturnPickupFailedSchema>;
