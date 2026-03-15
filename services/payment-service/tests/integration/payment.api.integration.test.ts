import { execFileSync } from 'child_process';
import crypto from 'crypto';
import type { Express, NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import type { Role } from '@fs/shared';
import request from 'supertest';
import { Queue } from 'bullmq';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PAYMENT_EVENT,
  PAYMENT_EVENT_QUEUE_NAME,
  PAYMENT_METHOD_HINT,
  PAYMENT_STATUS,
} from '../../src/constants/payment.constants';

const VALID_ROLES: Role[] = ['customer', 'superAdmin', 'inventoryManager', 'supportAgent'];

const razorpaySpies = vi.hoisted(() => ({
  createOrder: vi.fn(),
  fetchPayment: vi.fn(),
  refundPayment: vi.fn(),
}));

vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: {
      create: razorpaySpies.createOrder,
    },
    payments: {
      fetch: razorpaySpies.fetchPayment,
      refund: razorpaySpies.refundPayment,
    },
  })),
}));

vi.mock('@fs/shared', async () => {
  const actual = await vi.importActual<typeof import('@fs/shared')>('@fs/shared');

  const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
    const userId = req.header('x-test-user-id');
    const roleHeader = req.header('x-test-role');

    if (!userId || !roleHeader || !VALID_ROLES.includes(roleHeader as Role)) {
      next(new actual.AppError(actual.ErrorCode.JWT_INVALID, 'Authentication required'));
      return;
    }

    req.user = {
      userId,
      role: roleHeader as Role,
    };

    next();
  };

  const requireRole =
    (...roles: Role[]) =>
    (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user) {
        next(new actual.AppError(actual.ErrorCode.JWT_INVALID, 'Authentication required'));
        return;
      }

      if (!roles.includes(req.user.role)) {
        next(
          new actual.AppError(
            actual.ErrorCode.INSUFFICIENT_ROLE,
            'You do not have permission to perform this action'
          )
        );
        return;
      }

      next();
    };

  return {
    ...actual,
    requireAuth,
    requireRole,
  };
});

const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  DO $$
  BEGIN
    CREATE TYPE payment_method_type AS ENUM ('UPI', 'CARD', 'NETBANKING', 'COD');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  DO $$
  BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(15) NOT NULL,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    role VARCHAR(30) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PLACED',
    payment_method payment_method_type NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    is_cod_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    amount NUMERIC(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'PENDING',
    method_hint VARCHAR(50),
    failure_reason TEXT,
    refund_id VARCHAR(100),
    refund_amount NUMERIC(10,2),
    card_last4 VARCHAR(4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    before_json JSONB,
    after_json JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const signPayload = (payload: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

const hasContainerRuntime = (() => {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const describeIntegration = hasContainerRuntime ? describe : describe.skip;

describeIntegration('Payment API integration', () => {
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let app: Express;
  let pool: Pool;
  let inspectionQueue: Queue;
  let paymentEventQueue: Queue;

  const webhookSecret = 'test_webhook_secret';
  const razorpaySecret = 'test_razorpay_secret';

  beforeAll(async () => {
    postgresContainer = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'payment_service_test',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'postgres',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();

    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    process.env.APP_ENV = 'test';
    process.env.DB_HOST = postgresContainer.getHost();
    process.env.DB_PORT = String(postgresContainer.getMappedPort(5432));
    process.env.DB_NAME = 'payment_service_test';
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = String(redisContainer.getMappedPort(6379));
    process.env.RAZORPAY_KEY_ID = 'test_key_id';
    process.env.RAZORPAY_KEY_SECRET = razorpaySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    const sharedModule = await import('@fs/shared');
    const paymentRoutesModule = await import('../../src/routes/payment.routes');
    const paymentAppModule = await import('../../src/index');

    app = paymentAppModule.default;
    pool = sharedModule.getDbPool();
    paymentEventQueue = paymentRoutesModule.paymentEventQueue;
    inspectionQueue = new Queue(PAYMENT_EVENT_QUEUE_NAME, {
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    });

    await pool.query(SCHEMA_SQL);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    razorpaySpies.createOrder.mockReset();
    razorpaySpies.fetchPayment.mockReset();
    razorpaySpies.refundPayment.mockReset();
    await pool.query('TRUNCATE TABLE admin_audit_log, payments, orders, users RESTART IDENTITY CASCADE');
    await inspectionQueue.obliterate({ force: true });
  });

  afterAll(async () => {
    if (inspectionQueue) {
      await inspectionQueue.close();
    }
    if (paymentEventQueue) {
      await paymentEventQueue.close();
    }
    if (pool) {
      await pool.end();
    }
    if (postgresContainer) {
      await postgresContainer.stop();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  const seedUser = async (user: {
    id: string;
    mobile: string;
    firebaseUid: string;
    role: Role;
  }): Promise<void> => {
    await pool.query(
      `
        INSERT INTO users (id, mobile, firebase_uid, role)
        VALUES ($1, $2, $3, $4)
      `,
      [user.id, user.mobile, user.firebaseUid, user.role]
    );
  };

  const seedOrder = async (order: {
    id: string;
    userId: string;
    paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'COD';
    totalAmount: number;
    isCodConfirmed?: boolean;
  }): Promise<void> => {
    await pool.query(
      `
        INSERT INTO orders (
          id,
          user_id,
          payment_method,
          subtotal,
          discount_amount,
          gst_amount,
          total_amount,
          is_cod_confirmed
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        order.id,
        order.userId,
        order.paymentMethod,
        order.totalAmount,
        0,
        0,
        order.totalAmount,
        order.isCodConfirmed ?? false,
      ]
    );
  };

  const seedPayment = async (payment: {
    orderId: string;
    userId: string;
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
    status: string;
    amount: number;
    currency?: string;
    methodHint?: string | null;
    failureReason?: string | null;
    refundId?: string | null;
    refundAmount?: number | null;
    cardLast4?: string | null;
  }): Promise<void> => {
    await pool.query(
      `
        INSERT INTO payments (
          order_id,
          user_id,
          razorpay_order_id,
          razorpay_payment_id,
          amount,
          currency,
          status,
          method_hint,
          failure_reason,
          refund_id,
          refund_amount,
          card_last4
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        payment.orderId,
        payment.userId,
        payment.razorpayOrderId ?? null,
        payment.razorpayPaymentId ?? null,
        payment.amount,
        payment.currency ?? 'INR',
        payment.status,
        payment.methodHint ?? null,
        payment.failureReason ?? null,
        payment.refundId ?? null,
        payment.refundAmount ?? null,
        payment.cardLast4 ?? null,
      ]
    );
  };

  const listQueueJobs = async (name: string): Promise<Array<{ name: string; data: Record<string, unknown> }>> => {
    const jobs = await inspectionQueue.getJobs(['wait', 'delayed', 'active']);
    return jobs
      .filter((job) => job.name === name)
      .map((job) => ({
        name: job.name,
        data: job.data as Record<string, unknown>,
      }));
  };

  it('should return 401 with the shared error shape when payment initiation is unauthenticated', async () => {
    const response = await request(app).post('/api/payments/initiate').send({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 499.99,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      errorCode: 'JWT_INVALID',
      message: 'Authentication required',
    });
  });

  it('should return 400 with the shared error shape when the initiate payload is invalid', async () => {
    const response = await request(app)
      .post('/api/payments/initiate')
      .set('x-test-user-id', 'user-123')
      .set('x-test-role', 'customer')
      .send({
        orderId: 'not-a-uuid',
        amount: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
    });
  });

  it('should initiate a Razorpay payment through the real app and persist the payment row', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const orderId = '550e8400-e29b-41d4-a716-446655440002';

    await seedUser({
      id: userId,
      mobile: '9876543210',
      firebaseUid: 'firebase-user-1',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId,
      paymentMethod: 'UPI',
      totalAmount: 499.99,
    });

    razorpaySpies.createOrder.mockResolvedValue({
      id: 'order_rzp_123',
      amount: 49999,
      currency: 'INR',
    });

    const response = await request(app)
      .post('/api/payments/initiate')
      .set('x-test-user-id', userId)
      .set('x-test-role', 'customer')
      .send({
        orderId,
        amount: 1,
        currency: 'INR',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        razorpayOrderId: 'order_rzp_123',
        amount: 49999,
        currency: 'INR',
        key: 'test_key_id',
      },
    });

    const paymentRow = await pool.query(
      'SELECT razorpay_order_id, amount, status FROM payments WHERE order_id = $1',
      [orderId]
    );
    expect(paymentRow.rows[0]).toMatchObject({
      razorpay_order_id: 'order_rzp_123',
      amount: '499.99',
      status: PAYMENT_STATUS.pending,
    });
  });

  it('should return 404 when initiating payment for an order owned by another user', async () => {
    await seedUser({
      id: '550e8400-e29b-41d4-a716-446655440003',
      mobile: '9876543211',
      firebaseUid: 'firebase-user-2',
      role: 'customer',
    });
    await seedUser({
      id: '550e8400-e29b-41d4-a716-446655440004',
      mobile: '9876543212',
      firebaseUid: 'firebase-user-3',
      role: 'customer',
    });
    await seedOrder({
      id: '550e8400-e29b-41d4-a716-446655440005',
      userId: '550e8400-e29b-41d4-a716-446655440003',
      paymentMethod: 'UPI',
      totalAmount: 799.99,
    });

    const response = await request(app)
      .post('/api/payments/initiate')
      .set('x-test-user-id', '550e8400-e29b-41d4-a716-446655440004')
      .set('x-test-role', 'customer')
      .send({
        orderId: '550e8400-e29b-41d4-a716-446655440005',
        amount: 799.99,
        currency: 'INR',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      errorCode: 'ORDER_NOT_FOUND',
      message: 'Order not found',
    });
  });

  it('should verify a valid signature, update the payment, store last4, and enqueue payment.captured', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440006';
    const orderId = '550e8400-e29b-41d4-a716-446655440007';
    const razorpayOrderId = 'order_rzp_verify';
    const razorpayPaymentId = 'pay_rzp_verify';

    await seedUser({
      id: userId,
      mobile: '9876543213',
      firebaseUid: 'firebase-user-4',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId,
      paymentMethod: 'CARD',
      totalAmount: 1299.99,
    });
    await seedPayment({
      orderId,
      userId,
      razorpayOrderId,
      status: PAYMENT_STATUS.pending,
      amount: 1299.99,
    });

    razorpaySpies.fetchPayment.mockResolvedValue({
      method: 'card',
      card: { last4: '4242' },
    });

    const signature = signPayload(`${razorpayOrderId}|${razorpayPaymentId}`, razorpaySecret);

    const response = await request(app)
      .post('/api/payments/verify')
      .set('x-test-user-id', userId)
      .set('x-test-role', 'customer')
      .send({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: signature,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(PAYMENT_STATUS.captured);

    const paymentRow = await pool.query(
      'SELECT razorpay_payment_id, status, method_hint, card_last4 FROM payments WHERE order_id = $1',
      [orderId]
    );
    expect(paymentRow.rows[0]).toMatchObject({
      razorpay_payment_id: razorpayPaymentId,
      status: PAYMENT_STATUS.captured,
      method_hint: 'card',
      card_last4: '4242',
    });

    const jobs = await listQueueJobs(PAYMENT_EVENT.captured);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data).toMatchObject({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
    });
  });

  it('should return 400 for a tampered verify signature instead of bubbling a 500', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440008';
    const orderId = '550e8400-e29b-41d4-a716-446655440009';

    await seedUser({
      id: userId,
      mobile: '9876543214',
      firebaseUid: 'firebase-user-5',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId,
      paymentMethod: 'UPI',
      totalAmount: 999.99,
    });
    await seedPayment({
      orderId,
      userId,
      razorpayOrderId: 'order_bad_sig',
      status: PAYMENT_STATUS.pending,
      amount: 999.99,
    });

    const response = await request(app)
      .post('/api/payments/verify')
      .set('x-test-user-id', userId)
      .set('x-test-role', 'customer')
      .send({
        razorpayOrderId: 'order_bad_sig',
        razorpayPaymentId: 'pay_bad_sig',
        razorpaySignature: 'x',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Invalid payment signature',
    });
  });

  it('should return the existing captured payment on duplicate verify calls without duplicating events', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440010';
    const orderId = '550e8400-e29b-41d4-a716-446655440011';
    const razorpayOrderId = 'order_already_done';

    await seedUser({
      id: userId,
      mobile: '9876543215',
      firebaseUid: 'firebase-user-6',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId,
      paymentMethod: 'CARD',
      totalAmount: 1099.99,
    });
    await seedPayment({
      orderId,
      userId,
      razorpayOrderId,
      razorpayPaymentId: 'pay_existing',
      status: PAYMENT_STATUS.captured,
      amount: 1099.99,
      methodHint: 'card',
      cardLast4: '4242',
    });

    const response = await request(app)
      .post('/api/payments/verify')
      .set('x-test-user-id', userId)
      .set('x-test-role', 'customer')
      .send({
        razorpayOrderId,
        razorpayPaymentId: 'pay_existing',
        razorpaySignature: 'ignored',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(PAYMENT_STATUS.captured);
    expect(await listQueueJobs(PAYMENT_EVENT.captured)).toHaveLength(0);
  });

  it('should confirm COD without calling Razorpay, create a COD payment row, and enqueue payment.cod_confirmed', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440012';
    const orderId = '550e8400-e29b-41d4-a716-446655440013';

    await seedUser({
      id: userId,
      mobile: '9876543216',
      firebaseUid: 'firebase-user-7',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId,
      paymentMethod: 'COD',
      totalAmount: 699.99,
    });

    const response = await request(app)
      .post('/api/payments/cod/confirm')
      .set('x-test-user-id', userId)
      .set('x-test-role', 'customer')
      .send({ orderId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        orderId,
        isCodConfirmed: true,
        paymentStatus: PAYMENT_STATUS.pending,
      },
    });
    expect(razorpaySpies.createOrder).not.toHaveBeenCalled();

    const orderRow = await pool.query('SELECT is_cod_confirmed FROM orders WHERE id = $1', [orderId]);
    expect(orderRow.rows[0].is_cod_confirmed).toBe(true);

    const paymentRow = await pool.query('SELECT status, method_hint, razorpay_order_id FROM payments WHERE order_id = $1', [
      orderId,
    ]);
    expect(paymentRow.rows[0]).toMatchObject({
      status: PAYMENT_STATUS.pending,
      method_hint: PAYMENT_METHOD_HINT.cod,
      razorpay_order_id: null,
    });

    const jobs = await listQueueJobs(PAYMENT_EVENT.codConfirmed);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data).toMatchObject({
      userId,
      orderId,
    });
  });

  it('should hide payment status from a different customer', async () => {
    const ownerId = '550e8400-e29b-41d4-a716-446655440014';
    const otherUserId = '550e8400-e29b-41d4-a716-446655440015';
    const orderId = '550e8400-e29b-41d4-a716-446655440016';

    await seedUser({
      id: ownerId,
      mobile: '9876543217',
      firebaseUid: 'firebase-user-8',
      role: 'customer',
    });
    await seedUser({
      id: otherUserId,
      mobile: '9876543218',
      firebaseUid: 'firebase-user-9',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId: ownerId,
      paymentMethod: 'UPI',
      totalAmount: 399.99,
    });
    await seedPayment({
      orderId,
      userId: ownerId,
      razorpayOrderId: 'order_private',
      status: PAYMENT_STATUS.pending,
      amount: 399.99,
    });

    const response = await request(app)
      .get(`/api/payments/${orderId}/status`)
      .set('x-test-user-id', otherUserId)
      .set('x-test-role', 'customer');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Payment not found',
    });
  });

  it('should process payment.failed webhooks with the raw body, update the payment, and stay idempotent', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440017';
    const orderId = '550e8400-e29b-41d4-a716-446655440018';
    const razorpayOrderId = 'order_failed_webhook';

    await seedUser({
      id: userId,
      mobile: '9876543219',
      firebaseUid: 'firebase-user-10',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId,
      paymentMethod: 'UPI',
      totalAmount: 599.99,
    });
    await seedPayment({
      orderId,
      userId,
      razorpayOrderId,
      status: PAYMENT_STATUS.pending,
      amount: 599.99,
    });

    const webhookBody = JSON.stringify({
      event: PAYMENT_EVENT.failed,
      payload: {
        payment: {
          entity: {
            id: 'pay_failed',
            order_id: razorpayOrderId,
            method: 'upi',
            error_description: 'bank_declined',
          },
        },
      },
    });
    const signature = signPayload(webhookBody, webhookSecret);

    const firstResponse = await request(app)
      .post('/api/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(webhookBody);

    const secondResponse = await request(app)
      .post('/api/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(webhookBody);

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toEqual({
      success: true,
      data: {
        acknowledged: true,
        processed: true,
        event: PAYMENT_EVENT.failed,
      },
    });
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body).toEqual({
      success: true,
      data: {
        acknowledged: true,
        processed: false,
      },
    });

    const paymentRow = await pool.query(
      'SELECT status, failure_reason, razorpay_payment_id FROM payments WHERE order_id = $1',
      [orderId]
    );
    expect(paymentRow.rows[0]).toMatchObject({
      status: PAYMENT_STATUS.failed,
      failure_reason: 'bank_declined',
      razorpay_payment_id: 'pay_failed',
    });

    const jobs = await listQueueJobs(PAYMENT_EVENT.failed);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data).toMatchObject({
      orderId,
      razorpayOrderId,
      razorpayPaymentId: 'pay_failed',
      reason: 'bank_declined',
    });
  });

  it('should return 403 when a customer attempts an admin refund', async () => {
    const response = await request(app)
      .post('/api/admin/payments/550e8400-e29b-41d4-a716-446655440019/refund')
      .set('x-test-user-id', 'user-123')
      .set('x-test-role', 'customer')
      .send({ amount: 10 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      errorCode: 'INSUFFICIENT_ROLE',
      message: 'You do not have permission to perform this action',
    });
  });

  it('should refund a captured payment and append an admin audit log row', async () => {
    const adminId = '550e8400-e29b-41d4-a716-446655440020';
    const userId = '550e8400-e29b-41d4-a716-446655440021';
    const orderId = '550e8400-e29b-41d4-a716-446655440022';
    const razorpayOrderId = 'order_refund';

    await seedUser({
      id: adminId,
      mobile: '9876543220',
      firebaseUid: 'firebase-admin-1',
      role: 'superAdmin',
    });
    await seedUser({
      id: userId,
      mobile: '9876543221',
      firebaseUid: 'firebase-user-11',
      role: 'customer',
    });
    await seedOrder({
      id: orderId,
      userId,
      paymentMethod: 'CARD',
      totalAmount: 1499.99,
    });
    await seedPayment({
      orderId,
      userId,
      razorpayOrderId,
      razorpayPaymentId: 'pay_refund',
      status: PAYMENT_STATUS.captured,
      amount: 1499.99,
      methodHint: 'card',
      cardLast4: '4242',
    });

    razorpaySpies.refundPayment.mockResolvedValue({ id: 'refund_123' });

    const response = await request(app)
      .post(`/api/admin/payments/${orderId}/refund`)
      .set('x-test-user-id', adminId)
      .set('x-test-role', 'superAdmin')
      .send({
        amount: 1499.99,
        reason: 'customer_requested',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(PAYMENT_STATUS.refunded);

    const paymentRow = await pool.query(
      'SELECT status, refund_id, refund_amount FROM payments WHERE order_id = $1',
      [orderId]
    );
    expect(paymentRow.rows[0]).toMatchObject({
      status: PAYMENT_STATUS.refunded,
      refund_id: 'refund_123',
      refund_amount: '1499.99',
    });

    const auditRow = await pool.query(
      'SELECT admin_id, action, entity_type, before_json, after_json FROM admin_audit_log WHERE admin_id = $1',
      [adminId]
    );
    expect(auditRow.rows).toHaveLength(1);
    expect(auditRow.rows[0]).toMatchObject({
      admin_id: adminId,
      action: 'PAYMENT_REFUND',
      entity_type: 'PAYMENT',
    });
    expect(auditRow.rows[0].before_json.status).toBe(PAYMENT_STATUS.captured);
    expect(auditRow.rows[0].after_json.status).toBe(PAYMENT_STATUS.refunded);
  });
});
