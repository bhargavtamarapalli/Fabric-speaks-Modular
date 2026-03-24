import { z } from 'zod';
import { paginationSchema, uuidSchema } from '@fs/shared';

export const ChangeRoleSchema = z.object({
  role: z.enum(['customer', 'inventoryManager', 'supportAgent', 'superAdmin']),
});

export type ChangeRoleDto = z.infer<typeof ChangeRoleSchema>;

export const AdminListQuerySchema = paginationSchema.extend({
  'filter[role]': z.enum(['superAdmin', 'inventoryManager', 'supportAgent']).optional(),
  'filter[search]': z.string().optional()
});

export type AdminListQueryDto = z.infer<typeof AdminListQuerySchema>;

// Audit Log Filters
export const AuditLogQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  'filter[admin_id]': uuidSchema.optional(),
  'filter[action]': z.string().optional(),
  'filter[entity_type]': z.string().optional(),
  'filter[entity_id]': uuidSchema.optional(),
  'filter[created_at_from]': z.string().datetime().optional()
});

export type AuditLogQueryDto = z.infer<typeof AuditLogQuerySchema>;

/**
 * CreateAdminUserSchema excludes 'customer' role intentionally.
 * Admin users can only create other staff/staff-like accounts (inventoryManager, supportAgent, superAdmin).
 * Customer accounts are created via the public-facing auth flow.
 */
export const CreateAdminUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  role: z.enum(['inventoryManager', 'supportAgent', 'superAdmin'])
});

export type CreateAdminUserDto = z.infer<typeof CreateAdminUserSchema>;

const OPTIONAL_VALUE_KEYS = new Set([
  'admin_whatsapp',
  'inventory_manager_whatsapp',
  'admin_notification_preferences'
]);

export const UpdateSettingSchema = z.object({
  key: z.enum([
    'store_name',
    'store_email',
    'store_phone',
    'gst_number',
    'free_shipping_above',
    'cod_enabled',
    'stock_alert_threshold',
    'razorpay_live_mode',
    'admin_whatsapp',
    'inventory_manager_whatsapp',
    'admin_notification_preferences'
  ]),
  value: z.string().max(500),
}).superRefine((data, ctx) => {
  if (!OPTIONAL_VALUE_KEYS.has(data.key) && data.value.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'Value is required'
    });
  }
});

export type UpdateSettingDto = z.infer<typeof UpdateSettingSchema>;

export const CustomerLookupSchema = z.object({
  q: z.string().min(2).max(100),
});

export type CustomerLookupDto = z.infer<typeof CustomerLookupSchema>;

export const IdParamSchema = z.object({ id: z.string().uuid() });
