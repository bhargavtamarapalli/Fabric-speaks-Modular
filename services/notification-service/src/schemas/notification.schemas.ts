import { z } from 'zod';

export const OrderEventSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  orderId: z.string(),
  customerPhone: z.string().optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  awb: z.string().optional(),
  fabricType: z.string().optional(),
  paymentMethod: z.string().optional(),
  newStatus: z.string().optional(),
  previousStatus: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
});

export const StockEventSchema = z.object({
  variantId: z.string().optional(),
  sku: z.string().optional(),
  size: z.string().optional(),
  colour: z.string().optional(),
  productName: z.string(),
  stockCount: z.union([z.string(), z.number()]),
  threshold: z.union([z.string(), z.number()]).optional(),
});

export const ReturnEventSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  orderId: z.string(),
  returnId: z.string().optional(),
  customerPhone: z.string().optional(),
  pickupDate: z.string().optional(),
  days: z.union([z.string(), z.number()]).optional(),
  reason: z.string().optional(),
});

export const AdminEventSchema = z.object({
  adminId: z.string().uuid().optional(),
  adminName: z.string().optional(),
  role: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});

export const BroadcastNotificationSchema = z.object({
  recipientPhones: z.array(z.string().regex(/^\+91[0-9]{10}$/)).min(1).max(100),
  waTemplateName: z.string().min(1),
  waComponents: z.array(z.any()).optional(),
  fallbackSmsBody: z.string().min(1),
});

export type OrderEvent = z.infer<typeof OrderEventSchema>;
export type StockEvent = z.infer<typeof StockEventSchema>;
export type ReturnEvent = z.infer<typeof ReturnEventSchema>;
export type AdminEvent = z.infer<typeof AdminEventSchema>;
export type BroadcastNotification = z.infer<typeof BroadcastNotificationSchema>;
