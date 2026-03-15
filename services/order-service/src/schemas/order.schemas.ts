import { z } from 'zod';

export const GuestAddressSchema = z.object({
  full_name: z.string().min(1).max(100),
  mobile: z.string().min(10).max(15),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().min(4).max(10),
});

export const PlaceOrderSchema = z.object({
  cart_items: z.array(z.object({
    variant_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
  address_id: z.string().uuid().optional(),
  payment_method: z.enum(['UPI', 'CARD', 'NETBANKING', 'COD']),
  coupon_code: z.string().max(50).optional(),
  guest_mobile: z.string().min(10).max(15).optional(),
  guest_address: GuestAddressSchema.optional(),
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

export const CancelOrderSchema = z.object({
  reason: z.string().trim().min(10).max(500),
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

export const BulkInvoiceExportSchema = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
});

export const OrderIdParamSchema = z.object({ orderId: z.string().uuid() });
