import { Request, Response } from 'express';
import { PlaceOrderSchema, AdminUpdateOrderStatusSchema, PushToShiprocketSchema } from '../schemas/order.schemas';
import { OrderService } from '../services/order.service';
import { catchAsync } from '@fs/shared';

export class OrderController {
  constructor(private orderService: OrderService) {}

  placeOrder = catchAsync(async (req: Request, res: Response) => {
    const payload = PlaceOrderSchema.parse(req.body);
    const userId = req.user?.userId || 'guest'; 

    const order = await this.orderService.placeOrder(userId, payload);
    
    res.status(201).json({ success: true, data: order });
  });

  getMyOrders = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const orders = await this.orderService.getMyOrders(userId);
    res.status(200).json({ success: true, data: orders });
  });

  getOrderById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { orderId } = req.params;
    const order = await this.orderService.getOrderDetails(orderId as string, userId);
    res.status(200).json({ success: true, data: order });
  });

  trackGuestOrder = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.params;
    const order = await this.orderService.getOrderByTrackingToken(token as string);
    res.status(200).json({ success: true, data: order });
  });

  adminUpdateStatus = catchAsync(async (req: Request, res: Response) => {
    const payload = AdminUpdateOrderStatusSchema.parse(req.body);
    const { orderId } = req.params;
    
    const order = await this.orderService.updateOrderStatus(orderId as string, payload.status);
    res.status(200).json({ success: true, data: order });
  });

  adminPushToShiprocket = catchAsync(async (req: Request, res: Response) => {
    PushToShiprocketSchema.parse(req.body);
    const { orderId } = req.params;
    
    // shiprocket integration stub
    res.status(200).json({ success: true, data: { shiprocket_order_id: '12345', tracking_url: 'https://shiprocket.co/track/12345' } });
  });

  adminListOrders = catchAsync(async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: [] });
  });

  shiprocketWebhook = catchAsync(async (req: Request, res: Response) => {
    // Validate IP and Signature...
    res.status(200).json({ success: true });
  });
}
