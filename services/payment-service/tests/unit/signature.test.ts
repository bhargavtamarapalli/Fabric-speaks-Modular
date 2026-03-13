import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { PaymentService } from '../../src/services/payment.service';
import { PaymentRepository } from '../../src/repositories/payment.repository';
import { AppError, ErrorCode } from '@fs/shared/errors';

// Mock dependencies
vi.mock('razorpay', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            orders: { create: vi.fn() },
            payments: { refund: vi.fn() }
        }))
    };
});

vi.mock('bullmq', () => ({
    Queue: vi.fn().mockImplementation(() => ({
        add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    })),
}));

vi.mock('ioredis', () => ({
    default: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
    })),
}));

describe('PaymentService - Signature Verification', () => {
    let paymentService: PaymentService;
    const secret = 'test_secret';

    beforeEach(() => {
        process.env.RAZORPAY_KEY_SECRET = secret;
        paymentService = new PaymentService();
        vi.clearAllMocks();
    });

    it('should verify a valid signature', async () => {
        const orderId = 'order_123';
        const paymentId = 'pay_123';
        const body = orderId + '|' + paymentId;
        const signature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        // Mock repository to return a pending payment
        const mockRepo = {
            getPaymentByRazorpayOrderId: vi.fn().mockResolvedValue({ status: 'PENDING', orderId: 'internal_order_1' }),
            updatePayment: vi.fn().mockResolvedValue({ status: 'CAPTURED' }),
            getOrderTotal: vi.fn().mockResolvedValue(100.00)
        };
        (paymentService as any).paymentRepo = mockRepo;

        const result = await paymentService.verifyPayment({
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature
        });

        expect(result.status).toBe('CAPTURED');
        expect(mockRepo.updatePayment).toHaveBeenCalledWith(orderId, {
            razorpayPaymentId: paymentId,
            status: 'CAPTURED'
        });
    });

    it('should throw VALIDATION_ERROR for a tampered signature', async () => {
        const orderId = 'order_123';
        const paymentId = 'pay_123';
        const tamperedSignature = 'wrong_signature';

        const mockRepo = {
            getPaymentByRazorpayOrderId: vi.fn().mockResolvedValue({ status: 'PENDING' })
        };
        (paymentService as any).paymentRepo = mockRepo;

        await expect(paymentService.verifyPayment({
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: tamperedSignature
        })).rejects.toThrow(AppError);

        try {
            await paymentService.verifyPayment({
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
                razorpaySignature: tamperedSignature
            });
        } catch (e: any) {
            expect(e.code).toBe(ErrorCode.VALIDATION_ERROR);
        }
    });

    it('should reject if payment record does not exist', async () => {
        const mockRepo = {
            getPaymentByRazorpayOrderId: vi.fn().mockResolvedValue(null)
        };
        (paymentService as any).paymentRepo = mockRepo;

        await expect(paymentService.verifyPayment({
            razorpayOrderId: 'missing',
            razorpayPaymentId: 'pay_1',
            razorpaySignature: 'sig'
        })).rejects.toThrow('Payment record not found');
    });

    it('should be idempotent and return true if payment is already captured', async () => {
        const mockRepo = {
            getPaymentByRazorpayOrderId: vi.fn().mockResolvedValue({ status: 'CAPTURED', orderId: 'order_1' })
        };
        (paymentService as any).paymentRepo = mockRepo;

        const result = await paymentService.verifyPayment({
            razorpayOrderId: 'already_done',
            razorpayPaymentId: 'pay_1',
            razorpaySignature: 'sig'
        });

        expect(result.status).toBe('CAPTURED');
        expect(mockRepo.getPaymentByRazorpayOrderId).toHaveBeenCalled();
    });
});
