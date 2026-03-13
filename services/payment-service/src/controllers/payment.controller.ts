import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { 
  InitiatePaymentSchema, 
  VerifyPaymentSchema, 
  RefundPaymentSchema 
} from '../schemas/payment.schemas';
import { catchAsync } from '@fs/shared';

export class PaymentController {
    constructor(private paymentService: PaymentService) {}

    initiatePayment = catchAsync(async (req: Request, res: Response) => {
        const payload = InitiatePaymentSchema.parse(req.body);
        const userId = req.user!.userId;
        
        const session = await this.paymentService.initiatePayment(
            userId, 
            payload.orderId, 
            payload.amount, 
            payload.currency
        );
      
      res.status(200).json({ success: true, data: session });
    });

  verifyPayment = catchAsync(async (req: Request, res: Response) => {
    const payload = VerifyPaymentSchema.parse(req.body);
    const payment = await this.paymentService.verifyPayment(payload);
    res.status(200).json({ success: true, data: payment });
  });

  confirmCod = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.body;
    const userId = req.user!.userId;
    const result = await this.paymentService.confirmCod(userId, orderId);
    res.status(200).json({ success: true, data: result });
  });

  getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
    const orderId = req.params.orderId as string;
    const payment = await this.paymentService.getPaymentStatus(orderId!);
    res.status(200).json({ success: true, data: payment });
  });

  handleWebhook = catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);
    
    const result = await this.paymentService.handleWebhook(signature, rawBody);
    res.status(200).json(result);
  });

  refundPayment = catchAsync(async (req: Request, res: Response) => {
    const orderId = req.params.orderId as string;
    const adminId = req.user!.userId;
    const payload = RefundPaymentSchema.parse(req.body);
    const payment = await this.paymentService.refundPayment(adminId, orderId!, payload.amount);
    res.status(200).json({ success: true, data: payment });
  });
}
