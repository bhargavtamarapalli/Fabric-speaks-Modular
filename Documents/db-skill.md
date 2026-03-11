# SKILL: Database Layer
# Load this when: creating migrations, writing repositories, schema questions
# Antigravity: add to Knowledge Base as "db-skill"

## Creating a Migration

File: `db/migrations/{TIMESTAMP}_{description}.sql`
Example: `20250115120000_add_variant_sale_active.sql`

Rules:
- Forward-only. No rollback.
- Always `IF NOT EXISTS` / `IF EXISTS` guards
- Add GIN index on any new JSONB column
- UUID default: `gen_random_uuid()`
- Timestamps: `TIMESTAMPTZ NOT NULL DEFAULT now()`
- Soft delete: always add `is_deleted BOOLEAN NOT NULL DEFAULT false`

Example migration:
```sql
-- 20250115_add_expected_stock.sql
CREATE TABLE IF NOT EXISTS expected_stock (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id   UUID NOT NULL REFERENCES variants(id),
  qty_expected INTEGER NOT NULL CHECK (qty_expected > 0),
  expected_date DATE NOT NULL,
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expected_stock_variant_idx ON expected_stock(variant_id);
CREATE INDEX expected_stock_date_idx ON expected_stock(expected_date);
```

## Writing a Repository

Always implement a TypeScript interface first, then the class.

```typescript
// product.repository.ts

export interface IProductRepository {
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  findAll(filters: ProductFilters, page: number, limit: number): Promise<{ items: Product[]; total: number }>;
  create(dto: CreateProductDto): Promise<Product>;
  softDelete(id: string): Promise<void>;
}

export class ProductRepository implements IProductRepository {
  constructor(private db: Pool) {}

  async findBySlug(slug: string): Promise<Product | null> {
    const result = await this.db.query<DbProduct>(
      'SELECT * FROM products WHERE slug = $1 AND is_deleted = false',
      [slug]
    );
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  // IDOR pattern: always include user_id in WHERE for user-scoped data
  async findOrderById(id: string, userId: string): Promise<Order | null> {
    const result = await this.db.query<DbOrder>(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [id, userId]
    );
    return result.rows[0] ? mapOrder(result.rows[0]) : null;
    // Returns null if wrong user → service throws NOT_FOUND (not FORBIDDEN)
  }

  async softDelete(id: string): Promise<void> {
    await this.db.query(
      'UPDATE products SET is_deleted = true, deleted_at = now() WHERE id = $1',
      [id]
    );
    // Never: DELETE FROM products WHERE id = $1
  }
}
```

## DB→TS Field Mapping

Always map snake_case DB columns to camelCase TypeScript:
```typescript
function mapProduct(row: DbProduct): Product {
  return {
    id:          row.id,
    name:        row.name,
    slug:        row.slug,
    isActive:    row.is_active,
    saleActive:  row.sale_active,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}
```
