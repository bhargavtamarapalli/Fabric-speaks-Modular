import { Request, Response } from 'express';
import { z } from 'zod';
import { PlaceOrderSchema, AdminUpdateOrderStatusSchema, PushToShiprocketSchema, AdminListOrdersSchema, BulkPushToShiprocketSchema, OrderIdParamSchema, BulkUpdateOrderStatusSchema, CancelOrderSchema, BulkInvoiceExportSchema } from '../schemas/order.schemas';
import { OrderService } from '../services/order.service';
import { catchAsync } from '@fs/shared';

export class OrderController {
  constructor(private orderService: OrderService) {}

  placeOrder = catchAsync(async (req: Request, res: Response) => {
    const payload = PlaceOrderSchema.parse(req.body);
    const userId = req.user?.userId ?? null;

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
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const order = await this.orderService.getOrderDetails(orderId, userId);
    res.status(200).json({ success: true, data: order });
  });

  getOrderTimeline = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const timeline = await this.orderService.getOrderTimeline(orderId, userId);
    res.status(200).json({ success: true, data: timeline });
  });

  trackGuestOrder = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.params;
    const order = await this.orderService.getOrderByTrackingToken(token as string);
    res.status(200).json({ success: true, data: order });
  });

  adminUpdateStatus = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const payload = AdminUpdateOrderStatusSchema.parse(req.body);
    
    const order = await this.orderService.updateOrderStatus(orderId, payload.status, req.user!.userId, payload.notes);
    res.status(200).json({ success: true, data: order });
  });

  adminCancelOrder = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const { reason } = CancelOrderSchema.parse(req.body);
    const order = await this.orderService.cancelOrder(orderId, req.user!.userId, reason);
    res.status(200).json({ success: true, data: order });
  });

  adminBulkPushToShiprocket = catchAsync(async (req: Request, res: Response) => {
    const { orderIds } = BulkPushToShiprocketSchema.parse(req.body);
    const results = await this.orderService.bulkPushToShiprocket(orderIds, req.user!.userId);
    res.status(200).json({ success: true, data: results });
  });

  adminBulkUpdateStatus = catchAsync(async (req: Request, res: Response) => {
    const { orderIds, status, notes } = BulkUpdateOrderStatusSchema.parse(req.body);
    const results = await this.orderService.bulkUpdateOrderStatus(orderIds, status, req.user!.userId, notes);
    res.status(200).json({ success: true, data: results });
  });

  adminPushToShiprocket = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = OrderIdParamSchema.parse(req.params);
    PushToShiprocketSchema.parse(req.body);
    
    // Push order to Shiprocket for fulfillment
    const result = await this.orderService.pushOrderToShiprocket(orderId, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  });

  adminListOrders = catchAsync(async (req: Request, res: Response) => {
    const filters = AdminListOrdersSchema.parse(req.query);
    const result = await this.orderService.listOrdersForAdmin(filters);
    res.status(200).json({ success: true, data: { items: result.items }, meta: { total: result.total } });
  });

  adminGetOrderById = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const order = await this.orderService.getAdminOrderDetails(orderId);
    res.status(200).json({ success: true, data: order });
  });

  adminGetOrderTimeline = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const timeline = await this.orderService.getOrderTimeline(orderId, null);
    res.status(200).json({ success: true, data: timeline });
  });

  adminExportOrders = catchAsync(async (req: Request, res: Response) => {
    const filters = AdminListOrdersSchema.parse(req.query);
    const csv = await this.orderService.exportOrdersCsv(filters);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
    res.status(200).send(csv);
  });

  adminGetPackingSlip = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const packingSlip = await this.orderService.getPackingSlip(orderId);
    res.status(200).json({ success: true, data: packingSlip });
  });

  adminGetGstInvoice = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = OrderIdParamSchema.parse(req.params);
    const invoice = await this.orderService.getGstInvoice(orderId);
    res.status(200).json({ success: true, data: invoice });
  });

  adminExportInvoices = catchAsync(async (req: Request, res: Response) => {
    const filters = BulkInvoiceExportSchema.parse(req.query);
    const csv = await this.orderService.exportBulkInvoicesCsv(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bulk_invoices_export.csv');
    res.status(200).send(csv);
  });

  adminGetPendingActions = catchAsync(async (_req: Request, res: Response) => {
    const pendingActions = await this.orderService.getPendingActionsDashboard();
    res.status(200).json({ success: true, data: pendingActions });
  });

  shiprocketWebhook = catchAsync(async (req: Request, res: Response) => {
    // SECURITY: Signature validation middleware should have already validated this request
    // (validateShiprocketWebhookSignature middleware in routes)
    const result = await this.orderService.handleShiprocketWebhook(req.body);
    res.status(200).json({ success: true, data: result });
  });
}
