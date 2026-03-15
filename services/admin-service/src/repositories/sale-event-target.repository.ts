import { BaseRepository } from '@fs/shared';
import { SaleEventScope } from './sale-event.repository';

export interface SaleEventTargetVariant {
  variantId: string;
  productId: string;
  productName: string;
  sku: string | null;
  size: string | null;
  colour: string | null;
  basePrice: number;
  salePrice: number | null;
  saleActive: boolean;
}

export class SaleEventTargetRepository extends BaseRepository {
  async getTargets(
    scope: SaleEventScope,
    scopeIds: string[],
    limit: number,
    offset: number
  ): Promise<{ total: number; items: SaleEventTargetVariant[] }> {
    const { joinClause, whereClause, params } = this.buildScopeFilter(scope, scopeIds);

    const baseFilter = `
      p.is_deleted = false
      AND p.is_active = true
      AND v.is_deleted = false
      AND v.is_active = true
    `;

    const filter = whereClause ? `${baseFilter} AND ${whereClause}` : baseFilter;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM variants v
      JOIN products p ON v.product_id = p.id
      ${joinClause}
      WHERE ${filter}
    `;

    const dataQuery = `
      SELECT
        v.id as "variantId",
        v.product_id as "productId",
        p.name as "productName",
        v.sku,
        v.size,
        v.colour,
        v.base_price as "basePrice",
        v.sale_price as "salePrice",
        v.sale_active as "saleActive"
      FROM variants v
      JOIN products p ON v.product_id = p.id
      ${joinClause}
      WHERE ${filter}
      ORDER BY p.name ASC, v.sku ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countRes = await this.query(countQuery, params);
    const dataRes = await this.query(dataQuery, [...params, limit, offset]);

    return {
      total: parseInt(countRes.rows[0]?.total || '0', 10),
      items: dataRes.rows.map((row) => ({
        variantId: String(row.variantId),
        productId: String(row.productId),
        productName: row.productName,
        sku: row.sku ?? null,
        size: row.size ?? null,
        colour: row.colour ?? null,
        basePrice: Number(row.basePrice),
        salePrice: row.salePrice === null ? null : Number(row.salePrice),
        saleActive: Boolean(row.saleActive)
      }))
    };
  }

  async applySale(scope: SaleEventScope, scopeIds: string[], discountType: 'PERCENT' | 'FIXED', discountValue: number): Promise<number> {
    const { joinClause, whereClause, params } = this.buildScopeFilter(scope, scopeIds);

    const baseFilter = `
      p.is_deleted = false
      AND p.is_active = true
      AND v.is_deleted = false
      AND v.is_active = true
    `;

    const filter = whereClause ? `${baseFilter} AND ${whereClause}` : baseFilter;

    const priceExpression = discountType === 'PERCENT'
      ? `ROUND(v.base_price * (1 - $${params.length + 1} / 100.0), 2)`
      : `GREATEST(v.base_price - $${params.length + 1}, 0)`;

    const query = `
      UPDATE variants v
      SET sale_active = true,
          sale_price = ${priceExpression},
          updated_at = now()
      FROM products p
      ${joinClause}
      WHERE v.product_id = p.id
        AND ${filter}
    `;

    const result = await this.query(query, [...params, discountValue]);
    return result.rowCount ?? 0;
  }

  async endSale(scope: SaleEventScope, scopeIds: string[]): Promise<number> {
    const { joinClause, whereClause, params } = this.buildScopeFilter(scope, scopeIds);

    const baseFilter = `
      p.is_deleted = false
      AND p.is_active = true
      AND v.is_deleted = false
      AND v.is_active = true
      AND v.sale_active = true
    `;

    const filter = whereClause ? `${baseFilter} AND ${whereClause}` : baseFilter;

    const query = `
      UPDATE variants v
      SET sale_active = false,
          sale_price = NULL,
          updated_at = now()
      FROM products p
      ${joinClause}
      WHERE v.product_id = p.id
        AND ${filter}
    `;

    const result = await this.query(query, params);
    return result.rowCount ?? 0;
  }

  private buildScopeFilter(scope: SaleEventScope, scopeIds: string[]) {
    const params: string[] = [];
    let joinClause = '';
    let whereClause = '';

    switch (scope) {
      case 'global':
        break;
      case 'collection': {
        joinClause = 'JOIN collection_products cp ON cp.product_id = p.id';
        params.push(...scopeIds);
        const placeholders = scopeIds.map((_, idx) => `$${idx + 1}`).join(', ');
        whereClause = `cp.collection_id IN (${placeholders})`;
        break;
      }
      case 'specific_products': {
        params.push(...scopeIds);
        const placeholders = scopeIds.map((_, idx) => `$${idx + 1}`).join(', ');
        whereClause = `v.product_id IN (${placeholders})`;
        break;
      }
      case 'fabric_type': {
        params.push(...scopeIds);
        const placeholders = scopeIds.map((_, idx) => `$${idx + 1}`).join(', ');
        whereClause = `p.attributes->>'fabric_type' IN (${placeholders})`;
        break;
      }
      default:
        break;
    }

    return { joinClause, whereClause, params };
  }
}
