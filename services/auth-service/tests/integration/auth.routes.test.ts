import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

vi.mock('../../src/lib/firebase', () => ({
    firebaseAuth: {
        verifyIdToken: vi.fn()
    }
}));

vi.mock('@fs/shared', async () => {
    const actual = await vi.importActual('@fs/shared');
    
    // Define mocks inside to avoid hoisting issues
    const redis = {
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(true),
        set: vi.fn().mockResolvedValue('OK'),
        ttl: vi.fn().mockResolvedValue(600),
    };

    const db = {
        query: vi.fn().mockImplementation((sql: string) => {
            if (sql.includes('SELECT * FROM users')) {
                return Promise.resolve({ rows: [{ id: 'user_123', role: 'customer', firebase_uid: 'fb_123' }] });
            }
            return Promise.resolve({ rows: [], rowCount: 1 });
        }),
    };

    return {
        ...actual,
        getRedisClient: () => redis,
        getDbPool: () => db,
        requireAuth: (req: any, _res: any, next: any) => {
            if (req.headers.cookie?.includes('jwt=valid_token')) {
                req.user = { userId: 'user_123', role: 'customer' };
                return next();
            }
            return next(new (actual as any).AppError((actual as any).ErrorCode.JWT_INVALID, 'Authentication required'));
        },
    };
});
describe('Auth Service - Flow Tests', () => {
    it('GET /health returns 200 OK', async () => {
        const response = await request(app).get('/api/v1/auth/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok', service: 'auth-service' });
    });

    it('POST /customer/login-otp sends OTP and returns 200', async () => {
        const response = await request(app)
            .post('/api/v1/auth/customer/login-otp')
            .send({ mobile: '9876543210' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('DELETE /delete-account without Auth fails with 401', async () => {
        const response = await request(app)
            .delete('/api/v1/auth/delete-account');
        
        expect(response.status).toBe(401);
        expect(response.body.error.message).toContain('Authentication required');
    });

    it('POST /customer/login-otp with invalid mobile returns 400', async () => {
        const response = await request(app)
            .post('/api/v1/auth/customer/login-otp')
            .send({ mobile: '123' });
        
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /customer/login-otp hit rate limit returns 429', async () => {
        const { getRedisClient } = await import('@fs/shared');
        const redis = getRedisClient();
        vi.mocked(redis.incr).mockResolvedValueOnce(10); // Higher than 3 or 5

        const response = await request(app)
            .post('/api/v1/auth/customer/login-otp')
            .send({ mobile: '9999999999' });
        
        expect(response.status).toBe(429);
        expect(response.body.errorCode).toBe('OTP_RATE_LIMIT_MOBILE');
    });

    it('POST /logout returns 200 and clears cookie', async () => {
        const response = await request(app)
            .post('/api/v1/auth/logout');
        
        expect(response.status).toBe(200);
        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies![0]).toContain('jwt=;'); // Cookie cleared
    });

    it('GET /me with valid token returns user data and CSRF header', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', ['jwt=valid_token']);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.userId).toBe('user_123');
        expect(response.headers['x-csrf-token']).toBeDefined();
    });

    it('DELETE /delete-account with Auth but NO CSRF fails with 400', async () => {
        const response = await request(app)
            .delete('/api/v1/auth/delete-account')
            .set('Cookie', ['jwt=valid_token']);
        
        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('CSRF');
    });

    it('DELETE /delete-account with Auth AND CSRF returns 200', async () => {
        // First get a CSRF token from a GET request that passes Auth
        const meResponse = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', ['jwt=valid_token']);
        
        const csrfToken = meResponse.headers['x-csrf-token'] as string;
        expect(csrfToken).toBeDefined();

        const response = await request(app)
            .delete('/api/v1/auth/delete-account')
            .set('Cookie', ['jwt=valid_token'])
            .set('X-CSRF-Token', csrfToken);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
