import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PlaceOrderSchema, AdminUpdateOrderStatusSchema, PushToShiprocketSchema } from '../schemas/order.schemas';
import { OrderService } from '../services/order.service';

const orderService = new OrderService();

export class OrderController {

  placeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = PlaceOrderSchema.parse(req.body);
      const userId = req.user?.userId || 'guest'; 
      // Guest orders: we could parse a session ID instead, but sticking to userId logic for now.

      const order = await orderService.placeOrder(userId, payload);
      
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      }
      next(error);
    }
  };

  getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const orders = await orderService.getMyOrders(userId);
      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { orderId } = req.params;
      const order = await orderService.getOrderDetails(orderId as string, userId);
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  trackGuestOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const order = await orderService.getOrderByTrackingToken(token as string);
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  adminUpdateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = AdminUpdateOrderStatusSchema.parse(req.body);
      const { orderId } = req.params;
      
      const order = await orderService.updateOrderStatus(orderId as string, payload.status);
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      }
      next(error);
    }
  };

  adminPushToShiprocket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = PushToShiprocketSchema.parse(req.body);
      const { orderId } = req.params;
      
      // shiprocket integration stub
      res.status(200).json({ success: true, data: { shiprocket_order_id: '12345', tracking_url: 'https://shiprocket.co/track/12345' } });
    } catch (error) {
      next(error);
    }
  };

  adminListOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  };

  shiprocketWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate IP and Signature...
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
