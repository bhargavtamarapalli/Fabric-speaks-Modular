import { Request, Response } from 'express';
import { PlaceOrderSchema, AdminUpdateOrderStatusSchema, PushToShiprocketSchema, AdminListOrdersSchema } from '../schemas/order.schemas';
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
    
    const order = await this.orderService.updateOrderStatus(orderId as string, payload.status, req.user!.userId);
    res.status(200).json({ success: true, data: order });
  });

  adminPushToShiprocket = catchAsync(async (req: Request, res: Response) => {
    PushToShiprocketSchema.parse(req.body);
    const { orderId } = req.params;
    
    // Push order to Shiprocket for fulfillment
    const result = await this.orderService.pushOrderToShiprocket(orderId as string, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  });

  adminListOrders = catchAsync(async (req: Request, res: Response) => {
    const filters = AdminListOrdersSchema.parse(req.query);
    const result = await this.orderService.listOrdersForAdmin(filters);
    res.status(200).json({ success: true, data: { items: result.items }, meta: { total: result.total } });
  });

  shiprocketWebhook = catchAsync(async (req: Request, res: Response) => {
    // SECURITY: Signature validation middleware should have already validated this request
    // (validateShiprocketWebhookSignature middleware in routes)
    const result = await this.orderService.handleShiprocketWebhook(req.body);
    res.status(200).json({ success: true, data: result });
  });
}
