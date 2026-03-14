import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { getDbPool } from '@fs/shared';

// Mock requireAuth to always pass
vi.mock('@fs/shared', async () => {
  const actual = await vi.importActual('@fs/shared');
  return {
    ...actual,
    requireAuth: (req: any, res: any, next: any) => {
      req.user = { userId: '51d382d6-7a3b-42b7-873b-7a33e382d67e', role: 'inventoryManager' };
      next();
    }
  };
});

describe('Inventory API Integration', () => {
  const pool = getDbPool();

  beforeEach(async () => {
    // Clean up or seed data if necessary
    // await pool.query('DELETE FROM inventory_adjustment_log');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /admin/inventory', () => {
    it('should return 200 and list inventory', async () => {
      const response = await request(app)
        .get('/admin/inventory')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PATCH /admin/inventory/:variantId', () => {
    it('should fail if reason is missing', async () => {
      const variantId = 'eeb7c044-67d4-42b7-873b-7a33e382d67d';
      await request(app)
        .patch(`/admin/inventory/${variantId}`)
        .send({ newQty: 10 })
        .expect(400);
    });

    it('should fail if qty is negative', async () => {
       const variantId = 'eeb7c044-67d4-42b7-873b-7a33e382d67d';
       await request(app)
         .patch(`/admin/inventory/${variantId}`)
         .send({ newQty: -5, reason: 'Test' })
         .expect(400);
     });
  });

  describe('POST /admin/inventory/expected', () => {
    it('should validate arrival date format', async () => {
      await request(app)
        .post('/admin/inventory/expected')
        .send({
          variantId: 'eeb7c044-67d4-42b7-873b-7a33e382d67d',
          expectedQty: 10,
          arrivalDate: 'not-a-date'
        })
        .expect(400);
    });
  });
});
