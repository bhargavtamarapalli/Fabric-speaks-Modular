import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { 
  InitiatePaymentSchema, 
  VerifyPaymentSchema, 
  RefundPaymentSchema 
} from '../schemas/payment.schemas';
import { z } from 'zod';

const paymentService = new PaymentService();

export class PaymentController {
  initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = InitiatePaymentSchema.parse(req.body);
      const userId = req.user!.userId;
      
      const session = await paymentService.initiatePayment(
        userId, 
        payload.orderId, 
        payload.amount, 
        payload.currency
      );
      
      res.status(200).json({ success: true, data: session });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      }
      next(error);
    }
  };

  verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = VerifyPaymentSchema.parse(req.body);
      const payment = await paymentService.verifyPayment(payload);
      res.status(200).json({ success: true, data: payment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      }
      next(error);
    }
  };

  confirmCod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.body;
      const userId = req.user!.userId;
      const result = await paymentService.confirmCod(userId, orderId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId as string;
      const payment = await paymentService.getPaymentStatus(orderId);
      res.status(200).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  };

  handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = JSON.stringify(req.body);
      
      const result = await paymentService.handleWebhook(signature, rawBody);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  refundPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId as string;
      const adminId = req.user!.userId;
      const payload = RefundPaymentSchema.parse(req.body);
      const payment = await paymentService.refundPayment(adminId, orderId, payload.amount);
      res.status(200).json({ success: true, data: payment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      }
      next(error);
    }
  };
}
