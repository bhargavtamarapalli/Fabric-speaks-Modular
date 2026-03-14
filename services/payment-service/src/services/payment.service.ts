import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Queue } from 'bullmq';
import { PaymentRepository } from '../repositories/payment.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { env } from '../config/env';
import { AppError, ErrorCode, logger, getDbPool } from '@fs/shared';
import { Redis } from 'ioredis';

export class PaymentService {
    private razorpay: Razorpay;
    private eventQueue: Queue;

    constructor(
        private paymentRepo: PaymentRepository,
        private auditLogRepo: AuditLogRepository
    ) {
    this.razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID!,
      key_secret: env.RAZORPAY_KEY_SECRET!
    });
    
    // Redis connection for BullMQ
    const redisConnection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379
    };
    this.eventQueue = new Queue('payment-events', { connection: redisConnection });
  }

  async initiatePayment(userId: string, orderId: string, amount: number, currency: string = 'INR') {
    // Rule 1: Never trust client prices. Fetch from DB.
    const dbAmount = await this.paymentRepo.getOrderTotal(orderId);
    if (!dbAmount) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
    
    // Safety check: if client sent amount, it must match DB (optional, but good for debugging)
    if (Math.abs(dbAmount - amount) > 0.01) {
      console.warn(`Amount mismatch for order ${orderId}: Client=${amount}, DB=${dbAmount}`);
    }

    // 1. Create Razorpay order
    const options = {
      amount: Math.round(dbAmount * 100), // Razorpay expects paise
      currency,
      receipt: orderId,
      notes: { userId, orderId }
    };

    try {
      const rzpOrder = await this.razorpay.orders.create(options);

      // 2. Store in DB
      const payment = await this.paymentRepo.createPayment({
        orderId: orderId,
        userId: userId,
        razorpayOrderId: rzpOrder.id,
        amount: dbAmount,
        currency,
        status: 'PENDING'
      });

      return {
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error: any) {
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, `Razorpay error: ${error.message}`);
    }
  }

  async verifyPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;

    // 1. Idempotency Check
    const existingPayment = await this.paymentRepo.getPaymentByRazorpayOrderId(razorpayOrderId);
    if (!existingPayment) throw new AppError(ErrorCode.NOT_FOUND, 'Payment record not found');
    if (existingPayment.status === 'CAPTURED') return existingPayment;

    // 2. Signature Verification
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid payment signature');
    }

    // 3. Update Status
    const updatedPayment = await this.paymentRepo.updatePayment(razorpayOrderId, {
      razorpayPaymentId,
      status: 'CAPTURED'
      // methodHint can be fetched from Razorpay API if needed
    });

    // 4. Emit event (BullMQ)
    await this.eventQueue.add('payment.captured', { 
      orderId: existingPayment.orderId,
      razorpayOrderId,
      razorpayPaymentId
    });
    
    return updatedPayment;
  }

  async confirmCod(userId: string, orderId: string) {
    // Directly emit payment.cod_confirmed per request
    await this.eventQueue.add('payment.cod_confirmed', { userId, orderId });
    return { success: true, message: 'COD Confirmed' };
  }

  async getPaymentStatus(orderId: string) {
    const payment = await this.paymentRepo.getPaymentByOrderId(orderId);
    if (!payment) throw new AppError(ErrorCode.NOT_FOUND, 'Payment not found');
    return payment;
  }

  async handleWebhook(signature: string, rawBody: string) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid webhook signature');
    }

    const event = JSON.parse(rawBody);
    const rzpOrderId = event.payload.payment.entity.order_id;

    if (event.event === 'payment.failed') {
      await this.paymentRepo.updatePayment(rzpOrderId, {
        status: 'FAILED',
        failureReason: event.payload.payment.entity.error_description
      });
      
      const payment = await this.paymentRepo.getPaymentByRazorpayOrderId(rzpOrderId);
      await this.eventQueue.add('payment.failed', { 
        orderId: payment?.orderId,
        razorpayOrderId: rzpOrderId,
        reason: event.payload.payment.entity.error_description
      });
    } else if (event.event === 'payment.captured') {
        // Handle captured if not already handled by verify
        await this.paymentRepo.updatePayment(rzpOrderId, {
            razorpayPaymentId: event.payload.payment.entity.id,
            status: 'CAPTURED',
            methodHint: event.payload.payment.entity.method
        });
        
        const payment = await this.paymentRepo.getPaymentByRazorpayOrderId(rzpOrderId);
        await this.eventQueue.add('payment.captured', { 
            orderId: payment?.orderId,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: event.payload.payment.entity.id
        });
    }

    return { success: true };
  }

  async refundPayment(adminId: string, orderId: string, amount?: number) {
    const payment = await this.paymentRepo.getPaymentByOrderId(orderId);
    if (!payment || payment.status !== 'CAPTURED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Payment not refundable');
    }

    const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId!, {
      amount: amount ? Math.round(amount * 100) : undefined,
      speed: 'normal'
    });

    const updatedPayment = await this.paymentRepo.updatePayment(payment.razorpayOrderId!, {
      status: 'REFUNDED',
      refundId: refund.id,
      refundAmount: amount || payment.amount
    });

    // Rule 6: Admin mutations must write audit log
    await this.auditLogRepo.insert({
      admin_id: adminId,
      action: 'PAYMENT_REFUND',
      resource_type: 'PAYMENT',
      resource_id: payment.id,
      payload: { amount: amount || payment.amount, refundId: refund.id }
    });

    return updatedPayment;
  }

  async reconcilePayment(razorpayOrderId: string) {
    const payment = await this.paymentRepo.getPaymentByRazorpayOrderId(razorpayOrderId);
    if (!payment || payment.status !== 'PENDING') return payment;

    try {
      const rzpOrder = await this.razorpay.orders.fetch(razorpayOrderId);
      // Razorpay order status: 'created', 'attempted', 'paid'
      
      if (rzpOrder.status === 'paid') {
        const updatedPayment = await this.paymentRepo.updatePayment(razorpayOrderId, {
          status: 'CAPTURED'
        });
        
        await this.eventQueue.add('payment.captured', { 
          orderId: payment.orderId,
          razorpayOrderId: razorpayOrderId
        });
        
        return updatedPayment;
      }
    } catch (error: any) {
      console.error(`Reconciliation failed for ${razorpayOrderId}:`, error.message);
    }
    
    return payment;
  }
}
