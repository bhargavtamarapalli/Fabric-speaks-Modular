import { z } from 'zod';

export const OrderEventSchema = z.object({
  userId: z.string().uuid(),
  orderId: z.string(),
  customerPhone: z.string(),
  totalAmount: z.string().optional(),
  awb: z.string().optional(),
  fabricType: z.string().optional(),
});

export const StockEventSchema = z.object({
  productName: z.string(),
  stockCount: z.union([z.string(), z.number()]),
});

export const ReturnEventSchema = z.object({
  userId: z.string().uuid(),
  orderId: z.string(),
  customerPhone: z.string(),
  pickupDate: z.string().optional(),
  days: z.union([z.string(), z.number()]).optional(),
});

export type OrderEvent = z.infer<typeof OrderEventSchema>;
export type StockEvent = z.infer<typeof StockEventSchema>;
export type ReturnEvent = z.infer<typeof ReturnEventSchema>;
