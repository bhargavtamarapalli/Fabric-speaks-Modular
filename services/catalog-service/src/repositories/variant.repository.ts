import {
  BaseRepository,
  Variant,
  IVariantRepository,
  CreateVariantDto,
  BulkVariantUpdateDto,
  UpdateVariantDto,
  DbClient,
  AppError,
  ErrorCode,
} from '@fs/shared';

export { Variant };

export class VariantRepository extends BaseRepository implements IVariantRepository {
  async findById(id: string): Promise<Variant | null> {
    const result = await this.query('SELECT * FROM variants WHERE id = $1 AND is_deleted = false', [
      id,
    ]);
    return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
  }

  async findByProductId(productId: string): Promise<Variant[]> {
    const result = await this.query(
      'SELECT * FROM variants WHERE product_id = $1 AND is_deleted = false',
      [productId]
    );
    return result.rows.map((row) => this.mapVariant(row));
  }

  async findByProductIds(productIds: string[]): Promise<Record<string, Variant[]>> {
    if (productIds.length === 0) return {};
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
    const queryStr = `SELECT * FROM variants WHERE product_id IN (${placeholders}) AND is_deleted = false`;
    const result = await this.query(queryStr, productIds);
    const variants = result.rows.map((row) => this.mapVariant(row));
    const grouped: Record<string, Variant[]> = {};
    for (const variant of variants) {
      if (!grouped[variant.productId]) grouped[variant.productId] = [];
      grouped[variant.productId]!.push(variant);
    }
    return grouped;
  }

  async findBySku(sku: string): Promise<Variant | null> {
    const result = await this.query(
      'SELECT * FROM variants WHERE sku = $1 AND is_deleted = false',
      [sku]
    );
    return result.rows[0] ? this.mapVariant(result.rows[0]) : null;
  }

  /**
   * PHASE 1 - Task 1.1: Find variants by multiple SKUs
   * Used for batch SKU uniqueness validation before insert
   */
  async findBySkus(skus: string[]): Promise<string[]> {
    if (skus.length === 0) return [];
    const placeholders = skus.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await this.query(
      `SELECT sku FROM variants WHERE sku IN (${placeholders}) AND is_deleted = false`,
      skus
    );
    return rows.map((r) => r.sku);
  }

  /**
   * PHASE 1 - Task 1.1: Verify SKU uniqueness in batch before transaction
   * Detects duplicates within batch AND in DB
   */
  async verifySkuUniqueness(skus: string[]): Promise<void> {
    if (skus.length === 0) return;
    
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      const duplicates = skus.filter((sku, idx) => skus.indexOf(sku) !== idx);
      throw new AppError(
        ErrorCode.DUPLICATE_SKU,
        `Duplicate SKU(s) found in batch: ${Array.from(new Set(duplicates)).join(', ')}`
      );
    }
    
    const existing = await this.findBySkus(skus);
    if (existing.length > 0) {
      throw new AppError(
        ErrorCode.SKU_ALREADY_EXISTS,
        `SKU(s) already exist: ${existing.join(', ')}`
      );
    }
  }

  async updateStock(id: string, qty: number): Promise<void> {
    await this.query(
      'UPDATE variants SET qty = $1, updated_at = now() WHERE id = $2 AND is_deleted = false',
      [qty, id]
    );
  }

  async create(dto: CreateVariantDto & { productId: string }, client?: DbClient): Promise<Variant> {
    const snakeDto: Record<string, any> = {};
    for (const [key, value] of Object.entries(dto)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (key === 'images') {
        snakeDto['images_json'] = JSON.stringify(value ?? []);
      } else if (key === 'badges') {
        snakeDto['badges_json'] = JSON.stringify(value ?? {});
      } else {
        snakeDto[snakeKey] = value;
      }
    }

    const columns = Object.keys(snakeDto);
    const values = Object.values(snakeDto);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const queryStr = `INSERT INTO variants (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const executor = client ?? this.db;
    const result = await executor.query(queryStr, values);
    return this.mapVariant(result.rows[0]);
  }

  /**
   * PHASE 1 - Task 1.1: Atomic bulk create with SKU validation
   * Validates all SKUs BEFORE transaction, then creates within transaction
   */
  async bulkCreate(
    productId: string,
    variants: CreateVariantDto[],
    client?: DbClient
  ): Promise<Variant[]> {
    // First: Validate all SKUs are unique (fail fast before transaction)
    const skus = variants.map((v) => v.sku);
    await this.verifySkuUniqueness(skus);

    // Second: Create within transaction (atomic)
    const created: Variant[] = [];
    for (const variant of variants) {
      created.push(await this.create({ ...variant, productId }, client));
    }
    return created;
  }

  async verifyBelongToProduct(
    variantIds: string[],
    productId: string,
    client?: DbClient
  ): Promise<boolean> {
    if (variantIds.length === 0) return true;

    const placeholders = variantIds.map((_, index) => `$${index + 2}`).join(', ');
    const executor = client ?? this.db;
    const { rows } = await executor.query(
      `
                SELECT COUNT(*)::int AS count
                FROM variants
                WHERE product_id = $1
                  AND is_deleted = false
                  AND id IN (${placeholders})
            `,
      [productId, ...variantIds]
    );

    return rows[0]?.count === variantIds.length;
  }

  /**
   * PHASE 1 - Task 1.3: ATOMIC Bulk Update
   * 
   * BEFORE (BROKEN): N separate UPDATE statements in loop
   *   - Variant 51 fails? Variants 1-50 already committed
   *   - Partial update leaves data inconsistent
   * 
   * AFTER (FIXED): Single UPDATE with JSONB unnest
   *   - All updates in one query
   *   - All-or-nothing atomicity
   *   - Runs within parent transaction (SERIALIZABLE isolation)
   */
  async bulkUpdate(updates: BulkVariantUpdateDto[], client?: DbClient): Promise<Variant[]> {
    if (updates.length === 0) return [];
    
    const executor = client ?? this.db;
    const { AppError, ErrorCode } = require('@fs/shared');

    // Build atomic update query using JSONB unnest
    const updateJsonb = JSON.stringify(updates);
    const variantIds = updates.map((u) => u.variantId);

    // Single atomic UPDATE - all variants updated together or none
    const query = `
      WITH updates_batch AS (
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
          variantId UUID,
          size VARCHAR,
          colour VARCHAR,
          sizeLabel VARCHAR,
          basePrice NUMERIC,
          priceOverride NUMERIC,
          salePrice NUMERIC,
          saleActive BOOLEAN,
          qty INTEGER,
          badges JSONB,
          images JSONB,
          isActive BOOLEAN
        )
      )
      UPDATE variants v
      SET
        size = COALESCE(u.size::VARCHAR, v.size),
        colour = COALESCE(u.colour::VARCHAR, v.colour),
        size_label = COALESCE(u.sizeLabel::VARCHAR, v.size_label),
        base_price = COALESCE(u.basePrice::NUMERIC, v.base_price),
        price_override = COALESCE(u.priceOverride::NUMERIC, v.price_override),
        sale_price = COALESCE(u.salePrice::NUMERIC, v.sale_price),
        sale_active = COALESCE(u.saleActive::BOOLEAN, v.sale_active),
        qty = COALESCE(u.qty::INTEGER, v.qty),
        badges_json = COALESCE(u.badges, v.badges_json),
        images_json = COALESCE(u.images, v.images_json),
        is_active = COALESCE(u.isActive::BOOLEAN, v.is_active),
        updated_at = now()
      FROM updates_batch u
      WHERE v.id = u.variantId AND v.is_deleted = false
      RETURNING v.*
    `;

    try {
      const { rows } = await executor.query(query, [updateJsonb]);

      // Verify all requested updates were applied
      if (rows.length !== updates.length) {
        const updatedIds = rows.map((r) => r.id);
        const missingIds = variantIds.filter((id) => !updatedIds.includes(id));
        throw new AppError(
          ErrorCode.VARIANT_NOT_FOUND,
          `${missingIds.length} variant(s) not found or deleted`
        );
      }

      return rows.map((row) => this.mapVariant(row));
    } catch (err: any) {
      // Re-throw AppError, convert other errors
      if (err instanceof AppError) throw err;
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        `Bulk variant update failed: ${err.message}`
      );
    }
  }

  async updateById(id: string, dto: UpdateVariantDto, client?: DbClient): Promise<Variant> {
    const executor = client ?? this.db;
    const sets: string[] = [];
    const params: any[] = [id];

    const mapping: Record<string, string> = {
      sizeLabel: 'size_label',
      basePrice: 'base_price',
      priceOverride: 'price_override',
      salePrice: 'sale_price',
      saleActive: 'sale_active',
      qty: 'qty',
      isActive: 'is_active',
    };

    Object.entries(mapping).forEach(([key, column]) => {
      const value = (dto as any)[key];
      if (value !== undefined) {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      }
    });

    if (dto.badges !== undefined) {
      params.push(JSON.stringify(dto.badges));
      sets.push(`badges_json = $${params.length}`);
    }

    if (dto.images !== undefined) {
      params.push(JSON.stringify(dto.images));
      sets.push(`images_json = $${params.length}`);
    }

    if (sets.length === 0) {
      const current = await this.findById(id);
      if (!current) {
        throw new Error(`Variant ${id} not found`);
      }
      return current;
    }

    const { rows } = await executor.query(
      `UPDATE variants
             SET ${sets.join(', ')}, updated_at = now()
             WHERE id = $1 AND is_deleted = false
             RETURNING *`,
      params
    );

    if (!rows[0]) {
      throw new Error(`Variant ${id} not found`);
    }

    return this.mapVariant(rows[0]);
  }

  async deactivate(id: string, client?: DbClient): Promise<Variant> {
    const executor = client ?? this.db;
    const { rows } = await executor.query(
      `UPDATE variants
             SET is_active = false, updated_at = now()
             WHERE id = $1 AND is_deleted = false
             RETURNING *`,
      [id]
    );

    if (!rows[0]) {
      throw new Error(`Variant ${id} not found`);
    }

    return this.mapVariant(rows[0]);
  }

  async countActiveOrders(id: string): Promise<number> {
    const { rows } = await this.query(
      `SELECT COUNT(*)::int AS count
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.variant_id = $1
               AND o.status NOT IN ('DELIVERED', 'CANCELLED', 'RETURNED')`,
      [id]
    );
    return rows[0]?.count ?? 0;
  }

  async countActiveNotifySubscriptions(id: string): Promise<number> {
    const { rows } = await this.query(
      `SELECT COUNT(*)::int AS count
             FROM stock_notifications
             WHERE variant_id = $1
               AND is_active = true`,
      [id]
    );
    return rows[0]?.count ?? 0;
  }

  async bulkAdjustPrices(options: {
    targetType: 'product' | 'variant' | 'collection' | 'brand' | 'global';
    targetIds: string[];
    adjustmentType: 'PERCENT' | 'FIXED';
    adjustmentValue: number;
    applyTo: 'base_price' | 'price_override';
  }): Promise<number> {
    const params: any[] = [];
    let joinClause = 'JOIN products p ON p.id = v.product_id';
    let whereClause = `v.is_deleted = false AND v.is_active = true AND p.is_deleted = false AND p.is_active = true`;

    if (options.targetType !== 'global') {
      params.push(options.targetIds);
      const idParam = `$${params.length}`;
      switch (options.targetType) {
        case 'product':
          whereClause += ` AND p.id = ANY(${idParam})`;
          break;
        case 'variant':
          whereClause += ` AND v.id = ANY(${idParam})`;
          break;
        case 'collection':
          joinClause += ' JOIN collection_products cp ON cp.product_id = p.id';
          whereClause += ` AND cp.collection_id = ANY(${idParam})`;
          break;
        case 'brand':
          whereClause += ` AND p.brand_id = ANY(${idParam})`;
          break;
        default:
          break;
      }
    }

    const valueParamIndex = params.length + 1;
    params.push(options.adjustmentValue);

    const targetColumn = options.applyTo === 'price_override' ? 'price_override' : 'base_price';
    const baseExpression =
      options.applyTo === 'price_override'
        ? 'COALESCE(v.price_override, v.base_price)'
        : 'v.base_price';

    const priceExpression =
      options.adjustmentType === 'PERCENT'
        ? `GREATEST(ROUND(${baseExpression} * (1 + $${valueParamIndex} / 100.0), 2), 0)`
        : `GREATEST(${baseExpression} + $${valueParamIndex}, 0)`;

    // Convert JOIN clause to PostgreSQL FROM syntax
    const fromClause = joinClause ? `FROM ${joinClause}` : '';
    const query = `
            UPDATE variants v
            SET ${targetColumn} = ${priceExpression},
                updated_at = now()
            ${fromClause}
            WHERE ${whereClause}
        `;

    const result = await this.query(query, params);
    return result.rowCount ?? 0;
  }

  /**
   * PHASE 2 - Task 2.8: Optimistic Locking
   * Update variant with version check to detect concurrent modifications
   * Throws error if version has changed since read
   */
  async updateWithOptimisticLock(
    id: string,
    currentVersion: number,
    updates: Partial<Variant>,
    client?: DbClient
  ): Promise<Variant> {
    const executor = client ?? this.db;

    const sets: string[] = [];
    const params: unknown[] = [id, currentVersion];
    let paramIndex = 3;

    if (updates.qty !== undefined) {
      sets.push(`qty = $${paramIndex}`);
      params.push(updates.qty);
      paramIndex++;
    }
    if (updates.basePrice !== undefined) {
      sets.push(`base_price = $${paramIndex}`);
      params.push(updates.basePrice);
      paramIndex++;
    }
    if (updates.salePrice !== undefined) {
      sets.push(`sale_price = $${paramIndex}`);
      params.push(updates.salePrice);
      paramIndex++;
    }
    if (updates.isActive !== undefined) {
      sets.push(`is_active = $${paramIndex}`);
      params.push(updates.isActive);
      paramIndex++;
    }

    if (sets.length === 0) {
      const { rows } = await executor.query(
        'SELECT * FROM variants WHERE id = $1 AND is_deleted = false',
        [id]
      );
      if (!rows[0]) {
        throw new Error(`Variant ${id} not found`);
      }
      return this.mapVariant(rows[0]);
    }

    // Include version in WHERE clause for optimistic locking
    sets.push('version = version + 1');
    sets.push('updated_at = now()');

    const { rows } = await executor.query(
      `UPDATE variants
       SET ${sets.join(', ')}
       WHERE id = $1 AND version = $2 AND is_deleted = false
       RETURNING *`,
      params
    );

    if (!rows[0]) {
      // Check if variant exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Variant ${id} not found`);
      }
      // If exists but no rows updated, version conflict
      throw new Error(
        `Optimistic lock conflict: Version mismatch. Current version: ${existing.version}, expected: ${currentVersion}`
      );
    }

    return this.mapVariant(rows[0]);
  }

  /**
   * PHASE 2 - Task 2.8: Optimistic Locking
   * Bulk update with optimistic locking - fails if any version conflicts
   * Returns count of successfully updated variants
   */
  async bulkUpdateWithOptimisticLock(
    updates: Array<{ id: string; version: number; data: Partial<Variant> }>,
    client?: DbClient
  ): Promise<number> {
    const executor = client ?? this.db;
    let updatedCount = 0;

    for (const update of updates) {
      try {
        await this.updateWithOptimisticLock(
          update.id,
          update.version,
          update.data,
          executor
        );
        updatedCount++;
      } catch (error: any) {
        if (error.message.includes('Optimistic lock conflict')) {
          // Propagate version conflicts to caller
          throw error;
        }
        // Other errors can be logged but operation continues
        throw error;
      }
    }

    return updatedCount;
  }

  private mapVariant(row: Record<string, any>): Variant {
    const mapped = this.mapToCamelCase<Variant>(row);
    return {
      ...mapped,
      basePrice: parseFloat(row.base_price),
      priceOverride: row.price_override ? parseFloat(row.price_override) : undefined,
      salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
      badges: row.badges_json ?? undefined,
      images: row.images_json ?? [],
    };
  }

  async deleteBySizes(sizes: string[]): Promise<number> {
    if (sizes.length === 0) return 0;
    const placeholders = sizes.map((_, i) => `$${i + 1}`).join(', ');
    const { rowCount } = await this.query(
      `UPDATE variants SET is_deleted = true, updated_at = now() WHERE size IN (${placeholders}) AND is_deleted = false`,
      sizes
    );
    return rowCount ?? 0;
  }
}
