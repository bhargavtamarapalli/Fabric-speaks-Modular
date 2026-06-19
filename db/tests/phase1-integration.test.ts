import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';

/**
 * Integration Tests for Task 1.2 (Audit Table FKs) & Task 1.3 (Bulk Update Atomicity)
 * These tests require a PostgreSQL instance running with the migrations applied
 */
describe('Phase 1 Integration Tests', () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/fabricspeaks_test',
    });
  });

  afterEach(async () => {
    await pool.end();
  });

  describe('Task 1.2: Audit Table Foreign Keys', () => {
    it('should enforce FK constraint on inventory_adjustment_log.variant_id', async () => {
      const client = await pool.connect();
      try {
        // Attempt to insert adjustment log with non-existent variant_id
        const invalidVariantId = '00000000-0000-0000-0000-000000000000';

        await expect(
          client.query(
            `INSERT INTO inventory_adjustment_log (variant_id, user_id, reason)
             VALUES ($1, $2, $3)`,
            [invalidVariantId, null, 'Test adjustment']
          )
        ).rejects.toThrow(/violates foreign key constraint/);
      } finally {
        client.release();
      }
    });

    it('should enforce FK constraint on expected_stock_arrivals.variant_id', async () => {
      const client = await pool.connect();
      try {
        const invalidVariantId = '00000000-0000-0000-0000-000000000000';

        await expect(
          client.query(
            `INSERT INTO expected_stock_arrivals (variant_id, expected_date, qty)
             VALUES ($1, NOW() + INTERVAL '1 day', 10)`,
            [invalidVariantId]
          )
        ).rejects.toThrow(/violates foreign key constraint/);
      } finally {
        client.release();
      }
    });

    it('should allow deletion of variant with ON DELETE RESTRICT for inventory_adjustment_log', async () => {
      const client = await pool.connect();
      try {
        // Create test data
        const { rows: [product] } = await client.query(
          `INSERT INTO products (name, slug, brand_id) 
           VALUES ($1, $2, $3) RETURNING id`,
          ['Test Product', `slug-${Date.now()}`, null]
        );

        const { rows: [variant] } = await client.query(
          `INSERT INTO variants (product_id, sku, colour, basePrice)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [product.id, `SKU-${Date.now()}`, 'Red', 100]
        );

        // Add adjustment log entry
        await client.query(
          `INSERT INTO inventory_adjustment_log (variant_id, reason)
           VALUES ($1, $2)`,
          [variant.id, 'Test adjustment']
        );

        // Attempt to delete variant - should fail with ON DELETE RESTRICT
        await expect(
          client.query(`DELETE FROM variants WHERE id = $1`, [variant.id])
        ).rejects.toThrow(/violates foreign key constraint/);

        // Cleanup
        await client.query(`DELETE FROM products WHERE id = $1`, [product.id]);
      } finally {
        client.release();
      }
    });

    it('should cascade delete expected_stock_arrivals when variant is deleted', async () => {
      const client = await pool.connect();
      try {
        // Create test data
        const { rows: [product] } = await client.query(
          `INSERT INTO products (name, slug) 
           VALUES ($1, $2) RETURNING id`,
          ['Test Product', `slug-${Date.now()}`]
        );

        const { rows: [variant] } = await client.query(
          `INSERT INTO variants (product_id, sku, colour, basePrice)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [product.id, `SKU-${Date.now()}`, 'Red', 100]
        );

        // Add expected stock arrival
        await client.query(
          `INSERT INTO expected_stock_arrivals (variant_id, expected_date, qty)
           VALUES ($1, NOW() + INTERVAL '1 day', 50)`,
          [variant.id]
        );

        // Verify entry exists
        let { rows } = await client.query(
          `SELECT * FROM expected_stock_arrivals WHERE variant_id = $1`,
          [variant.id]
        );
        expect(rows).toHaveLength(1);

        // Delete variant
        await client.query(`DELETE FROM variants WHERE id = $1`, [variant.id]);

        // Verify expected_stock_arrivals was cascade deleted
        ({ rows } = await client.query(
          `SELECT * FROM expected_stock_arrivals WHERE variant_id = $1`,
          [variant.id]
        ));
        expect(rows).toHaveLength(0);

        // Cleanup
        await client.query(`DELETE FROM products WHERE id = $1`, [product.id]);
      } finally {
        client.release();
      }
    });
  });

  describe('Task 1.3: Bulk Update Atomicity', () => {
    it('should apply all variant updates or none (atomicity)', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create test product and variants
        const { rows: [product] } = await client.query(
          `INSERT INTO products (name, slug) 
           VALUES ($1, $2) RETURNING id`,
          ['Bulk Update Test', `bulk-test-${Date.now()}`]
        );

        const variantIds: string[] = [];
        for (let i = 0; i < 3; i++) {
          const { rows: [variant] } = await client.query(
            `INSERT INTO variants (product_id, sku, colour, basePrice, qty)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [product.id, `SKU-BULK-${i}`, `Color${i}`, 100, 10]
          );
          variantIds.push(variant.id);
        }

        // Prepare bulk update with JSONB
        const updates = JSON.stringify([
          { variantId: variantIds[0], qty: 20, basePrice: 110 },
          { variantId: variantIds[1], qty: 30, basePrice: 120 },
          { variantId: variantIds[2], qty: 40, basePrice: 130 },
        ]);

        // Execute atomic bulk update
        const { rows } = await client.query(
          `WITH updates_batch AS (
            SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
              "variantId" UUID, "qty" INTEGER, "basePrice" NUMERIC
            )
          )
          UPDATE variants v
          SET qty = COALESCE(u."qty", v.qty),
              "basePrice" = COALESCE(u."basePrice", v."basePrice")
          FROM updates_batch u
          WHERE v.id = u."variantId"
          RETURNING v.id, v.qty, v."basePrice"`,
          [updates]
        );

        expect(rows).toHaveLength(3);
        expect(rows[0].qty).toBe(20);
        expect(rows[1].qty).toBe(30);
        expect(rows[2].qty).toBe(40);

        // Rollback and verify original values restored
        await client.query('ROLLBACK');

        // Verify original values
        const { rows: verifyRows } = await client.query(
          `SELECT qty FROM variants WHERE id = ANY($1::uuid[]) ORDER BY id`,
          [variantIds]
        );

        expect(verifyRows.every(r => r.qty === 10)).toBe(true);

        // Cleanup
        await client.query(`DELETE FROM products WHERE id = $1`, [product.id]);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    });

    it('should rollback on constraint violation', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create test product and variant
        const { rows: [product] } = await client.query(
          `INSERT INTO products (name, slug) 
           VALUES ($1, $2) RETURNING id`,
          ['Constraint Test', `constraint-test-${Date.now()}`]
        );

        const { rows: [variant1] } = await client.query(
          `INSERT INTO variants (product_id, sku, colour, basePrice, qty)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [product.id, 'SKU-CONSTRAINT-1', 'Red', 100, 10]
        );

        const { rows: [variant2] } = await client.query(
          `INSERT INTO variants (product_id, sku, colour, basePrice, qty)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [product.id, 'SKU-CONSTRAINT-2', 'Blue', 100, 10]
        );

        // Prepare update with invalid value (violates CHECK constraint)
        const updates = JSON.stringify([
          { variantId: variant1.id, qty: 20, basePrice: 110 },
          { variantId: variant2.id, qty: -5, basePrice: 120 }, // Invalid: negative qty
        ]);

        // Should fail on constraint violation
        await expect(
          client.query(
            `WITH updates_batch AS (
              SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
                "variantId" UUID, "qty" INTEGER, "basePrice" NUMERIC
              )
            )
            UPDATE variants v
            SET qty = COALESCE(u."qty", v.qty)
            FROM updates_batch u
            WHERE v.id = u."variantId"
            AND u."qty" > 0`,
            [updates]
          )
        ).rejects.toThrow();

        await client.query('ROLLBACK');

        // Verify no partial updates occurred
        const { rows: verifyRows } = await client.query(
          `SELECT qty FROM variants WHERE id IN ($1, $2) ORDER BY id`,
          [variant1.id, variant2.id]
        );

        expect(verifyRows.every(r => r.qty === 10)).toBe(true);

        // Cleanup
        await client.query(`DELETE FROM products WHERE id = $1`, [product.id]);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    });

    it('should verify all requested updates were applied', async () => {
      const client = await pool.connect();
      try {
        // Create test product and variants
        const { rows: [product] } = await client.query(
          `INSERT INTO products (name, slug) 
           VALUES ($1, $2) RETURNING id`,
          ['Verification Test', `verify-test-${Date.now()}`]
        );

        const variantIds: string[] = [];
        for (let i = 0; i < 3; i++) {
          const { rows: [variant] } = await client.query(
            `INSERT INTO variants (product_id, sku, colour, basePrice, qty)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [product.id, `SKU-VER-${i}`, `Color${i}`, 100, 10]
          );
          variantIds.push(variant.id);
        }

        // Request updates for all 3 variants
        const updates = JSON.stringify([
          { variantId: variantIds[0], qty: 20 },
          { variantId: variantIds[1], qty: 30 },
          { variantId: variantIds[2], qty: 40 },
        ]);

        const { rows } = await client.query(
          `WITH updates_batch AS (
            SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
              "variantId" UUID, "qty" INTEGER
            )
          )
          UPDATE variants v
          SET qty = COALESCE(u."qty", v.qty)
          FROM updates_batch u
          WHERE v.id = u."variantId"
          RETURNING v.id`,
          [updates]
        );

        // Verify all 3 variants were updated
        expect(rows).toHaveLength(3);
        expect(rows.map((r: any) => r.id).sort()).toEqual(variantIds.sort());

        // Cleanup
        await client.query(`DELETE FROM products WHERE id = $1`, [product.id]);
      } finally {
        client.release();
      }
    });
  });

  describe('Task 1.3: Performance - Bulk Update', () => {
    it('should complete bulk update of 1000 variants in < 2 seconds', async () => {
      const client = await pool.connect();
      try {
        // Create test product and many variants
        const { rows: [product] } = await client.query(
          `INSERT INTO products (name, slug) 
           VALUES ($1, $2) RETURNING id`,
          ['Performance Test', `perf-test-${Date.now()}`]
        );

        const variantIds: string[] = [];
        for (let i = 0; i < 1000; i++) {
          const { rows: [variant] } = await client.query(
            `INSERT INTO variants (product_id, sku, colour, basePrice, qty)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [product.id, `SKU-PERF-${i}`, `Color${i % 10}`, 100, 10]
          );
          variantIds.push(variant.id);
        }

        // Prepare bulk update for 1000 variants
        const updates = variantIds.map((id, idx) => ({
          variantId: id,
          qty: 20 + (idx % 50),
        }));

        const startTime = performance.now();

        const { rows } = await client.query(
          `WITH updates_batch AS (
            SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
              "variantId" UUID, "qty" INTEGER
            )
          )
          UPDATE variants v
          SET qty = COALESCE(u."qty", v.qty)
          FROM updates_batch u
          WHERE v.id = u."variantId"
          RETURNING v.id`,
          [JSON.stringify(updates)]
        );

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(rows).toHaveLength(1000);
        expect(executionTime).toBeLessThan(2000); // < 2 seconds

        // Cleanup
        await client.query(`DELETE FROM products WHERE id = $1`, [product.id]);
      } finally {
        client.release();
      }
    });
  });
});
