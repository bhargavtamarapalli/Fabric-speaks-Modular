import { Request, Response } from 'express';
import { catchAsync } from '@fs/shared';
import { PaymentService } from '../services/payment.service';
import {
  ConfirmCodSchema,
  InitiatePaymentSchema,
  PaymentStatusParamsSchema,
  RazorpayWebhookSchema,
  RefundPaymentParamsSchema,
  RefundPaymentSchema,
  VerifyPaymentSchema,
} from '../schemas/payment.schemas';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  initiatePayment = catchAsync(async (req: Request, res: Response) => {
    const payload = InitiatePaymentSchema.parse(req.body);
    const userId = req.user!.userId;
    const session = await this.paymentService.initiatePayment(userId, payload);

    res.status(200).json({ success: true, data: session });
  });

  verifyPayment = catchAsync(async (req: Request, res: Response) => {
    const payload = VerifyPaymentSchema.parse(req.body);
    const payment = await this.paymentService.verifyPayment(payload);

    res.status(200).json({ success: true, data: payment });
  });

  confirmCod = catchAsync(async (req: Request, res: Response) => {
    const payload = ConfirmCodSchema.parse(req.body);
    const userId = req.user!.userId;
    const result = await this.paymentService.confirmCod(userId, payload);

    res.status(200).json({ success: true, data: result });
  });

  getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
    const params = PaymentStatusParamsSchema.parse(req.params);
    const userId = req.user!.userId;
    const payment = await this.paymentService.getPaymentStatus(userId, params.orderId);

    res.status(200).json({ success: true, data: payment });
  });

  handleWebhook = catchAsync(async (req: Request, res: Response) => {
    const payload = RazorpayWebhookSchema.parse({
      signature: req.headers['x-razorpay-signature'],
      rawBody: req.rawBody,
    });
    const result = await this.paymentService.handleWebhook(payload);

    res.status(200).json({ success: true, data: result });
  });

  refundPayment = catchAsync(async (req: Request, res: Response) => {
    const params = RefundPaymentParamsSchema.parse(req.params);
    const payload = RefundPaymentSchema.parse(req.body);
    const adminId = req.user!.userId;
    const payment = await this.paymentService.refundPayment(adminId, params.orderId, payload);

    res.status(200).json({ success: true, data: payment });
  });
}
