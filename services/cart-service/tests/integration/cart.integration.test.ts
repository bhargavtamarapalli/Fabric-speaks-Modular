import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Define mocks using vi.hoisted so they are available in the hoisted vi.mock
const { mockRedis, mockDb } = vi.hoisted(() => ({
    mockRedis: {
        get: vi.fn(),
        setex: vi.fn(),
        del: vi.fn(),
    },
    mockDb: {
        query: vi.fn(),
    },
}));

// Mock @fs/shared BEFORE importing app
vi.mock('@fs/shared', async () => {
    const actual = await vi.importActual('@fs/shared');
    return {
        ...actual,
        getRedisClient: () => mockRedis,
        getDbPool: () => mockDb,
        requireAuth: (req: any, _res: any, next: any) => {
            if (req.headers.authorization === 'Bearer valid_user_token') {
                req.user = { userId: 'user_123', role: 'customer' };
            }
            return next();
        },
    };
});

// Import app AFTER mocking
import app from '../../src/index';

describe('Cart Service - Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Guest Flow: Add item and verify price is locked', async () => {
        const variantId = '00000000-0000-0000-0000-000000000001';
        const sessionId = 'guest_session_123';

        // 1. Mock variant details from DB
        mockDb.query.mockResolvedValueOnce({
            rows: [{ stock_qty: 10, base_price: 299, sale_price: null }],
            rowCount: 1
        });

        // 2. Mock Redis get (initial cart is empty)
        mockRedis.get.mockResolvedValueOnce(null);

        // 3. Add Item to Guest Cart
        const addResponse = await request(app)
            .post('/api/items')
            .set('x-session-id', sessionId)
            .send({ variantId, quantity: 1 });

        expect(addResponse.status).toBe(200);

        // Verify Redis setex was called with price 299
        expect(mockRedis.setex).toHaveBeenCalled();
        const setexArgs = mockRedis.setex.mock.calls[0];
        expect(setexArgs[0]).toBe(`cart:guest:${sessionId}`);
        expect(setexArgs[2]).toContain('"price":299');

        // 4. Fetch Cart and check if price is 299
        mockRedis.get.mockResolvedValueOnce(JSON.stringify([{ variantId, quantity: 1, price: 299 }]));
        mockDb.query.mockResolvedValueOnce({
            rows: [{ stock_qty: 10, base_price: 399, sale_price: null }],
            rowCount: 1
        });

        const getResponse = await request(app)
            .get('/api')
            .set('x-session-id', sessionId);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.data.items[0].price).toBe(299);
        expect(getResponse.body.data.subtotal).toBe(299);
    });

    it('Merge Flow: Merge guest cart into user account', async () => {
        const sessionId = 'guest_session_123';
        const variantId = '00000000-0000-0000-0000-000000000001';

        // Mock guest cart in Redis
        mockRedis.get.mockResolvedValueOnce(JSON.stringify([{ variantId, quantity: 2, price: 299 }]));
        mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

        // Call merge endpoint
        const response = await request(app)
            .post('/api/merge')
            .set('Authorization', 'Bearer valid_user_token')
            .send({ guestSessionId: sessionId });

        expect(response.status).toBe(200);
        
        // Verify DB insert
        expect(mockDb.query).toHaveBeenCalled();
        const queryCall = mockDb.query.mock.calls.find(call => call[0].includes('INSERT INTO cart_items'));
        expect(queryCall).toBeDefined();
        expect(queryCall[1]).toEqual(expect.arrayContaining(['user_123', variantId, 2, 299]));

        // Verify guest cart was cleared
        expect(mockRedis.del).toHaveBeenCalledWith(`cart:guest:${sessionId}`);
    });
});
