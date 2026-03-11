import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Queue } from 'bullmq';
import { PaymentRepository } from '../repositories/payment.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { AppError, ErrorCode } from '@fs/shared/src/errors';
import { Redis } from 'ioredis';

export class PaymentService {
  private razorpay: Razorpay;
  private paymentRepo: PaymentRepository;
  private auditLogRepo: AuditLogRepository;
  private eventQueue: Queue;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });
    this.paymentRepo = new PaymentRepository();
    this.auditLogRepo = new AuditLogRepository();
    
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
        order_id: orderId,
        user_id: userId,
        razorpay_order_id: rzpOrder.id,
        amount: dbAmount,
        currency,
        status: 'PENDING'
      });

      return {
        razorpay_order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error: any) {
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, `Razorpay error: ${error.message}`);
    }
  }

  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

    // 1. Idempotency Check
    const existingPayment = await this.paymentRepo.getPaymentByRazorpayOrderId(razorpay_order_id);
    if (!existingPayment) throw new AppError(ErrorCode.NOT_FOUND, 'Payment record not found');
    if (existingPayment.status === 'CAPTURED') return existingPayment;

    // 2. Signature Verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid payment signature');
    }

    // 3. Update Status
    const updatedPayment = await this.paymentRepo.updatePayment(razorpay_order_id, {
      razorpay_payment_id,
      status: 'CAPTURED'
      // method_hint can be fetched from Razorpay API if needed
    });

    // 4. Emit event (BullMQ)
    await this.eventQueue.add('payment.captured', { 
      orderId: existingPayment.order_id,
      razorpay_order_id,
      razorpay_payment_id
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
        failure_reason: event.payload.payment.entity.error_description
      });
      
      const payment = await this.paymentRepo.getPaymentByRazorpayOrderId(rzpOrderId);
      await this.eventQueue.add('payment.failed', { 
        orderId: payment?.order_id,
        razorpay_order_id: rzpOrderId,
        reason: event.payload.payment.entity.error_description
      });
    } else if (event.event === 'payment.captured') {
        // Handle captured if not already handled by verify
        await this.paymentRepo.updatePayment(rzpOrderId, {
            razorpay_payment_id: event.payload.payment.entity.id,
            status: 'CAPTURED',
            method_hint: event.payload.payment.entity.method
        });
        
        const payment = await this.paymentRepo.getPaymentByRazorpayOrderId(rzpOrderId);
        await this.eventQueue.add('payment.captured', { 
            orderId: payment?.order_id,
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: event.payload.payment.entity.id
        });
    }

    return { success: true };
  }

  async refundPayment(adminId: string, orderId: string, amount?: number) {
    const payment = await this.paymentRepo.getPaymentByOrderId(orderId);
    if (!payment || payment.status !== 'CAPTURED') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Payment not refundable');
    }

    const refund = await this.razorpay.payments.refund(payment.razorpay_payment_id, {
      amount: amount ? Math.round(amount * 100) : undefined,
      speed: 'normal'
    });

    const updatedPayment = await this.paymentRepo.updatePayment(payment.razorpay_order_id, {
      status: 'REFUNDED',
      refund_id: refund.id,
      refund_amount: amount || payment.amount
    });

    // Rule 6: Admin mutations must write audit log
    await this.auditLogRepo.insert({
      admin_id: adminId,
      action: 'PAYMENT_REFUND',
      resource_type: 'PAYMENT',
      resource_id: payment.id,
      payload: { amount: amount || payment.amount, refund_id: refund.id }
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
          orderId: payment.order_id,
          razorpay_order_id: razorpayOrderId
        });
        
        return updatedPayment;
      }
    } catch (error: any) {
      console.error(`Reconciliation failed for ${razorpayOrderId}:`, error.message);
    }
    
    return payment;
  }
}
