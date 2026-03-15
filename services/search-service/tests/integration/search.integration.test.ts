import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getDbPool, getRedisClient, globalErrorHandler } from '@fs/shared';
import searchRoutes from '../../src/routes/search.routes';

// Mock requireAuth to bypass authentication in tests
vi.mock('@fs/shared', async () => {
    const actual = await vi.importActual('@fs/shared') as any;
    return {
        ...actual,
        requireAuth: (req: any, _res: any, next: any) => {
            req.user = { userId: 'test-user', role: 'customer' };
            next();
        },
    };
});

describe('Search Service Integration Tests', () => {
    const db = getDbPool();
    const redis = getRedisClient();
    let testApp: express.Express;

    beforeAll(async () => {
        testApp = express();
        testApp.use(express.json());
        testApp.use('/api', searchRoutes);
        testApp.use(globalErrorHandler);

        // Setup initial data
        await db.query('DELETE FROM products');
        await db.query(`
            INSERT INTO brands (id, name) VALUES ('b1', 'FabIndia') ON CONFLICT (id) DO NOTHING;
            INSERT INTO categories (id, name) VALUES ('c1', 'Saree') ON CONFLICT (id) DO NOTHING;
            INSERT INTO products (id, slug, name, description, base_price, fabric_type, brand_id, category_id, is_active)
            VALUES 
                ('p1', 'cotton-saree', 'Cotton Saree', 'Pure cotton saree', 1500, 'Cotton', 'b1', 'c1', true),
                ('p2', 'silk-saree', 'Silk Saree', 'Pure silk saree', 5000, 'Silk', 'b1', 'c1', true)
            ON CONFLICT (id) DO NOTHING;
        `);
    });

    afterAll(async () => {
        await db.query('DELETE FROM products');
        await redis.flushall();
    });

    beforeEach(async () => {
        await redis.flushall();
    });

    describe('Search Validation', () => {
        it('should return 400 for empty query and no filters', async () => {
            const res = await request(testApp).get('/api');
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('At least one search criterion');
        });

        it('should return 400 for query longer than 200 characters', async () => {
            const longQuery = 'a'.repeat(201);
            const res = await request(testApp).get(`/api?q=${longQuery}`);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 200 for valid search query', async () => {
            const res = await request(testApp).get('/api?q=cotton');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.results).toHaveLength(1);
        });
    });

    describe('Pattern Escaping', () => {
        it('should handle special characters like % and _ safely', async () => {
            // First, insert a product with special characters in name
            await db.query(`
                INSERT INTO products (id, slug, name, description, base_price, fabric_type, brand_id, category_id, is_active)
                VALUES ('p3', 'special-product', '100% Cotton', 'Fabric', 1000, 'Cotton', 'b1', 'c1', true)
            `);

            // Search for "100%"
            const res = await request(testApp).get('/api?q=100%');
            expect(res.status).toBe(200);
            // It should find "100% Cotton" but not be confused by the % sign being a wildcard
            // FTS usually handles % as a literal or ignores it depending on config, 
            // but ILIKE filters (like fabric/brand) definitely need it escaped.
            
            const resFabric = await request(testApp).get('/api?fabric=100%');
            expect(resFabric.status).toBe(200);
            
            await db.query('DELETE FROM products WHERE id = \'p3\'');
        });
    });

    describe('Suggestions & Fallback', () => {
        it('should cache suggestions in Redis', async () => {
            const q = 'cotton';
            const cacheKey = `search:suggest:${q}`;

            // First call
            await request(testApp).get(`/api/suggestions?q=${q}`);
            
            // Verify Redis has the data
            const cached = await redis.get(cacheKey);
            expect(cached).not.toBeNull();
            
            // Second call should use cache
            const res = await request(testApp).get(`/api/suggestions?q=${q}`);
            expect(res.status).toBe(200);
            expect(JSON.parse(cached!)).toEqual(res.body.data);
        });
    });
});
