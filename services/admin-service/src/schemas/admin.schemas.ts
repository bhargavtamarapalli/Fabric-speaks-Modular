import { z } from 'zod';
import { MobileSchema, PaginationSchema, UuidSchema } from '@fs/shared/schemas'; // Assuming shared base schemas exist

export const ChangeRoleSchema = z.object({
  role: z.enum(['customer', 'inventoryManager', 'supportAgent', 'superAdmin']),
});

export type ChangeRoleDto = z.infer<typeof ChangeRoleSchema>;

export const AdminListQuerySchema = PaginationSchema.extend({
  'filter[role]': z.enum(['superAdmin', 'inventoryManager', 'supportAgent']).optional()
});

export type AdminListQueryDto = z.infer<typeof AdminListQuerySchema>;

// Audit Log Filters
export const AuditLogQuerySchema = z.object({
  cursor: UuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  'filter[admin_id]': UuidSchema.optional(),
  'filter[action]': z.string().optional(),
  'filter[created_at_from]': z.string().datetime().optional()
});

export type AuditLogQueryDto = z.infer<typeof AuditLogQuerySchema>;
