import { z } from 'zod';
import { uuidSchema } from '@fs/shared';

export const ReportPaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ReportPaginationDto = z.infer<typeof ReportPaginationSchema>;

export const SalePerformanceParamsSchema = z.object({
  id: uuidSchema,
});

export type SalePerformanceParamsDto = z.infer<typeof SalePerformanceParamsSchema>;

export const LiveSaleMonitorSchema = z.object({
  windowMinutes: z.coerce.number().int().min(1).max(240).default(30),
  saleOnly: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : undefined), z.boolean().optional()),
  saleEventId: uuidSchema.optional(),
});

export type LiveSaleMonitorDto = z.infer<typeof LiveSaleMonitorSchema>;
