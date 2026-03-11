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
});

export const PushToShiprocketSchema = z.object({
  length: z.number().optional(),
  breadth: z.number().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
});
