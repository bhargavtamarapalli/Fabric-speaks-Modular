import {
  BaseRepository,
  Product,
  IProductRepository,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from '@fs/shared';

export { Product };

export class ProductRepository extends BaseRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const result = await this.query('SELECT * FROM products WHERE id = $1 AND is_deleted = false', [
      id,
    ]);
    return result.rows[0] ? this.mapToCamelCase<Product>(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const result = await this.query(
      'SELECT * FROM products WHERE slug = $1 AND is_deleted = false',
      [slug]
    );
    return result.rows[0] ? this.mapToCamelCase<Product>(result.rows[0]) : null;
  }

  async findAll(
    filters: ProductQueryDto
  ): Promise<{ items: Product[]; total?: number; hasNext?: boolean }> {
    const { cursor, page, limit, search, fabric, brand, minPrice, maxPrice } = filters;

    if (cursor) {
      // Cursor-based pagination
      let queryStr = 'SELECT p.* FROM products p ';
      const whereClauses: string[] = ['is_deleted = false'];
      const params: unknown[] = [];
      let paramIdx = 1;

      whereClauses.push(`p.id > $${paramIdx}`);
      params.push(cursor);
      paramIdx++;

      if (search) {
        whereClauses.push(
          `(to_tsvector('english', p.name || ' ' || COALESCE(p.attributes->>'fabric_type', '')) @@ plainto_tsquery('english', $${paramIdx}))`
        );
        params.push(search);
        paramIdx++;
      }

      if (fabric) {
        whereClauses.push(`p.attributes->>'fabric_type' = $${paramIdx}`);
        params.push(fabric);
        paramIdx++;
      }

      if (brand) {
        whereClauses.push(`p.brand_id = $${paramIdx}`);
        params.push(brand);
        paramIdx++;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        queryStr += 'JOIN variants v ON p.id = v.product_id ';
        if (minPrice !== undefined) {
          whereClauses.push(`v.base_price >= $${paramIdx}`);
          params.push(minPrice);
          paramIdx++;
        }
        if (maxPrice !== undefined) {
          whereClauses.push(`v.base_price <= $${paramIdx}`);
          params.push(maxPrice);
          paramIdx++;
        }
      }

      queryStr += ' WHERE ' + whereClauses.join(' AND ');
      queryStr += ` ORDER BY p.id LIMIT $${paramIdx}`;
      params.push(limit + 1);

      const result = await this.query(queryStr, params);
      const items = result.rows.slice(0, limit).map((row) => this.mapToCamelCase<Product>(row));
      const hasNext = result.rows.length > limit;

      return { items, hasNext };
    } else {
      // Page-based pagination
      const offset = ((page || 1) - 1) * limit;

      let queryStr = 'SELECT p.*, COUNT(*) OVER() as total_count FROM products p ';
      const whereClauses: string[] = ['is_deleted = false'];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (search) {
        whereClauses.push(
          `(to_tsvector('english', p.name || ' ' || COALESCE(p.attributes->>'fabric_type', '')) @@ plainto_tsquery('english', $${paramIdx}))`
        );
        params.push(search);
        paramIdx++;
      }

      if (fabric) {
        whereClauses.push(`p.attributes->>'fabric_type' = $${paramIdx}`);
        params.push(fabric);
        paramIdx++;
      }

      if (brand) {
        whereClauses.push(`p.brand_id = $${paramIdx}`);
        params.push(brand);
        paramIdx++;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        queryStr += 'JOIN variants v ON p.id = v.product_id ';
        if (minPrice !== undefined) {
          whereClauses.push(`v.base_price >= $${paramIdx}`);
          params.push(minPrice);
          paramIdx++;
        }
        if (maxPrice !== undefined) {
          whereClauses.push(`v.base_price <= $${paramIdx}`);
          params.push(maxPrice);
          paramIdx++;
        }
      }

      queryStr += ' WHERE ' + whereClauses.join(' AND ');
      queryStr += ` ORDER BY p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(limit, offset);

      const result = await this.query(queryStr, params);
      const items = result.rows.map((row) => this.mapToCamelCase<Product>(row));
      const total = result.rows[0] ? parseInt(result.rows[0].total_count) : 0;

      return { items, total };
    }
  }

  async findAllAdmin(filters: any): Promise<{ items: Product[]; total: number }> {
    const {
      page,
      limit,
      'filter[is_active]': isActive,
      'filter[brand_id]': brandId,
      'filter[has_sale]': hasSale,
      search,
    } = filters;
    const offset = (page - 1) * limit;

    let queryStr = 'SELECT p.*, COUNT(*) OVER() as total_count FROM products p ';
    const whereClauses: string[] = ['is_deleted = false'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      whereClauses.push(`(p.name ILIKE $${paramIdx} OR p.slug ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (isActive !== undefined) {
      whereClauses.push(`p.is_active = $${paramIdx}`);
      params.push(isActive === 'true');
      paramIdx++;
    }

    if (brandId) {
      whereClauses.push(`p.brand_id = $${paramIdx}`);
      params.push(brandId);
      paramIdx++;
    }

    if (hasSale !== undefined) {
      if (hasSale === 'true') {
        whereClauses.push(
          `EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.sale_active = true)`
        );
      } else {
        whereClauses.push(
          `NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.sale_active = true)`
        );
      }
    }

    queryStr += ' WHERE ' + whereClauses.join(' AND ');
    queryStr += ` ORDER BY p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const result = await this.query(queryStr, params);
    const items = result.rows.map((row) => this.mapToCamelCase<Product>(row));
    const total = result.rows[0] ? parseInt(result.rows[0].total_count) : 0;

    return { items, total };
  }

  /**
   * PHASE 2 - Task 2.1: Optimized query to fetch products with variants in SINGLE query
   * Eliminates N+1 query pattern (was: 1 product query + N variant queries)
   * Now: 1 query with json_agg to nest variants
   * 
   * For 100 products: 101 queries → 1 query (100x improvement)
   */
  async findAllAdminWithVariants(filters: any): Promise<{ items: any[]; total: number }> {
    const {
      page,
      limit,
      'filter[is_active]': isActive,
      'filter[brand_id]': brandId,
      'filter[has_sale]': hasSale,
      search,
    } = filters;
    const offset = ((page || 1) - 1) * (limit || 20);

    let queryStr = `
      SELECT 
        p.*,
        COUNT(*) OVER() as total_count,
        json_agg(
          json_build_object(
            'id', v.id,
            'sku', v.sku,
            'qty', v.qty,
            'basePrice', v.base_price,
            'salePrice', v.sale_price,
            'priceOverride', v.price_override,
            'saleActive', v.sale_active,
            'colour', v.colour,
            'size', v.size,
            'isDeleted', v.is_deleted,
            'createdAt', v.created_at,
            'updatedAt', v.updated_at
          ) ORDER BY v.created_at
        ) FILTER (WHERE v.is_deleted = false) as variants
      FROM products p
      LEFT JOIN variants v ON v.product_id = p.id
      WHERE p.is_deleted = false
    `;

    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      whereClauses.push(`(p.name ILIKE $${paramIdx} OR p.slug ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (isActive !== undefined) {
      whereClauses.push(`p.is_active = $${paramIdx}`);
      params.push(isActive === 'true');
      paramIdx++;
    }

    if (brandId) {
      whereClauses.push(`p.brand_id = $${paramIdx}`);
      params.push(brandId);
      paramIdx++;
    }

    if (hasSale !== undefined) {
      if (hasSale === 'true') {
        whereClauses.push(
          `EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.sale_active = true AND v.is_deleted = false)`
        );
      } else {
        whereClauses.push(
          `NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.sale_active = true AND v.is_deleted = false)`
        );
      }
    }

    if (whereClauses.length > 0) {
      queryStr += ' AND ' + whereClauses.join(' AND ');
    }

    queryStr += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit || 20, offset);

    const result = await this.query(queryStr, params);
    const items = result.rows.map((row) => {
      const product = this.mapToCamelCase<any>(row);
      // Parse variants array from JSON (handles null case where no variants)
      product.variants = (row.variants || []).filter((v: any) => v !== null);
      return product;
    });
    const total = result.rows[0] ? parseInt(result.rows[0].total_count) : 0;

    return { items, total };
  }

  async create(dto: CreateProductDto): Promise<Product> {
    // Extract fabric fields to map to JSONB 'attributes' column
    const fabricFields = [
      'fabricType',
      'gsmWeight',
      'weaveType',
      'breathabilityRating',
      'careInstructions',
      'fabricOrigin',
    ];

    const attributes: Record<string, any> = {};
    const snakeDto: Record<string, any> = {};

    for (const [key, value] of Object.entries(dto)) {
      if (fabricFields.includes(key)) {
        // Map camelCase to snake_case for JSONB storage
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        attributes[snakeKey] = value;
      } else {
        // Map non-fabric fields normally
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        snakeDto[snakeKey] = value;
      }
    }

    // Add attributes JSONB
    snakeDto['attributes'] = JSON.stringify(attributes);

    const columns = Object.keys(snakeDto);
    const values = Object.values(snakeDto);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const queryStr = `INSERT INTO products (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(queryStr, values);
    return this.mapToCamelCase<Product>(result.rows[0]);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const fabricFields = [
      'fabricType',
      'gsmWeight',
      'weaveType',
      'breathabilityRating',
      'careInstructions',
      'fabricOrigin',
    ];

    const attributes: Record<string, any> = {};
    const snakeDto: Record<string, any> = {};

    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;

      if (fabricFields.includes(key)) {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        attributes[snakeKey] = value;
      } else {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        snakeDto[snakeKey] = value;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [id];
    let paramIdx = 2;

    for (const [key, value] of Object.entries(snakeDto)) {
      updates.push(`${key} = $${paramIdx}`);
      values.push(value);
      paramIdx++;
    }

    if (Object.keys(attributes).length > 0) {
      updates.push(`attributes = attributes || $${paramIdx}`);
      values.push(JSON.stringify(attributes));
      paramIdx++;
    }

    if (updates.length === 0) {
      const result = await this.findById(id);
      if (!result) throw new Error('Product not found');
      return result;
    }

    const queryStr = `UPDATE products SET ${updates.join(', ')}, updated_at = now() WHERE id = $1 AND is_deleted = false RETURNING *`;
    const result = await this.query(queryStr, values);
    if (!result.rows[0]) throw new Error('Product not found');
    return this.mapToCamelCase<Product>(result.rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await this.query(
      'UPDATE products SET is_deleted = true, is_active = false, updated_at = now() WHERE id = $1',
      [id]
    );
    // Cascade soft delete to variants
    await this.query(
      'UPDATE variants SET is_deleted = true, is_active = false, updated_at = now() WHERE product_id = $1',
      [id]
    );
  }
}
