import { z } from 'zod';

export const PlaceOrderSchema = z.object({
  cart_items: z.array(z.object({
    variant_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
  address_id: z.string().uuid(),
  payment_method: z.enum(['UPI', 'CARD', 'NETBANKING', 'COD']),
  coupon_code: z.string().max(50).optional(),
});

export const AdminUpdateOrderStatusSchema = z.object({
  status: z.enum([
    'PLACED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'CONFIRMED',
    'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED',
    'RETURN_REQUESTED', 'RETURNED'
  ]),
  notes: z.string().optional()
}).refine(data => {
    if (data.status === 'CANCELLED' && (!data.notes || data.notes.trim().length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Reason (notes) is required when cancelling an order",
    path: ["notes"]
});

export const BulkPushToShiprocketSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(50),
});

export const BulkUpdateOrderStatusSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum([
    'PLACED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'CONFIRMED',
    'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED',
    'RETURN_REQUESTED', 'RETURNED'
  ]),
  notes: z.string().optional()
}).refine(data => {
    if (data.status === 'CANCELLED' && (!data.notes || data.notes.trim().length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Reason (notes) is required when cancelling an order",
    path: ["notes"]
});

export const PushToShiprocketSchema = z.object({
  length: z.number().optional(),
  breadth: z.number().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
});

export const AdminListOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  'filter[status]': z.enum([
    'PLACED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'CONFIRMED',
    'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED',
    'RETURN_REQUESTED', 'RETURNED'
  ]).optional(),
  'filter[payment_method]': z.enum(['UPI', 'CARD', 'NETBANKING', 'COD']).optional(),
  'filter[created_at_from]': z.string().datetime().optional(),
  'filter[created_at_to]': z.string().datetime().optional(),
});

export const OrderIdParamSchema = z.object({ orderId: z.string().uuid() });
