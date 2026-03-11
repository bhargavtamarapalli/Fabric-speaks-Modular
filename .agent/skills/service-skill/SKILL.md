# SKILL: Service & Controller Layer
# Load this when: implementing a new endpoint, writing service methods, controllers
# Antigravity: add to Knowledge Base as "service-skill"

## Controller Pattern — Always This Shape

```typescript
// catalog.controller.ts
import { Request, Response } from 'express';
import { CreateProductSchema } from '../schemas/catalog.schemas';
import { catalogService } from '../services/catalog.service';

export async function createProduct(req: Request, res: Response): Promise<void> {
  // 1. Validate with Zod — throws ZodError on invalid (caught by globalErrorHandler)
  const dto = CreateProductSchema.parse(req.body);

  // 2. Call service — throws AppError on business logic failure
  const product = await catalogService.createProduct(dto, req.user.userId);

  // 3. Return envelope — always { success: true, data: ... }
  res.status(201).json({ success: true, data: product });
}

// LIST endpoint with pagination
export async function listProducts(req: Request, res: Response): Promise<void> {
  const { page = '1', limit = '24', ...filters } = req.query;
  const result = await catalogService.listProducts(filters, parseInt(page), parseInt(limit));
  res.json({
    success: true,
    data: { items: result.items },
    meta: { page: parseInt(page), limit: parseInt(limit), total: result.total }
  });
}
```

## Service Pattern — Business Logic Lives Here

```typescript
// catalog.service.ts
import { AppError, ErrorCode } from '@fs/shared/errors';
import { getEffectivePrice } from '@fs/shared/pricing';  // RULE 1

export class CatalogService {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly variantRepo: IVariantRepository,
    private readonly auditLog: IAuditLogRepository,    // needed for admin mutations
  ) {}

  async getProductBySlug(slug: string): Promise<ProductDetail> {
    const product = await this.productRepo.findBySlug(slug);
    if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);  // RULE 4

    const variants = await this.variantRepo.findByProductId(product.id);
    return {
      ...product,
      variants: variants.map(v => ({
        ...v,
        effectivePrice: getEffectivePrice(v),  // RULE 1 — server calculates price
      }))
    };
  }

  async deactivateProduct(productId: string, adminId: string): Promise<void> {
    const product = await this.productRepo.findById(productId);
    if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND);

    await this.productRepo.softDelete(productId);

    // RULE 6 — audit log on every admin mutation
    await this.auditLog.insert({
      adminId,
      action: 'product_deactivate',
      targetType: 'product',
      targetId: productId,
    });
  }
}
```

## Route Pattern

```typescript
// catalog.routes.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '@fs/shared/middleware';
import { listProducts, getProduct, createProduct } from '../controllers/catalog.controller';

export const catalogRouter = Router();

// Public endpoints
catalogRouter.get('/products', listProducts);
catalogRouter.get('/products/:slug', getProduct);

// Admin endpoints — requireRole checks JWT claim
catalogRouter.post('/admin/products', requireAuth, requireRole('superAdmin', 'inventoryManager'), createProduct);
```

## Zod Schema Patterns

```typescript
// catalog.schemas.ts
import { z } from 'zod';

// Request body schema — matches API Design v1.1 exactly
export const CreateProductSchema = z.object({
  name:        z.string().min(3).max(200),
  slug:        z.string().regex(/^[a-z0-9-]+$/),
  brandId:     z.string().uuid(),
  categoryId:  z.string().uuid(),
  basePrice:   z.number().positive(),
  salePrice:   z.number().positive().optional(),
  saleActive:  z.boolean().default(false),
  attributes:  z.record(z.string()).optional(),  // { fabric: 'linen', weight: '180gsm' }
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;

// Query param schema
export const ProductQuerySchema = z.object({
  page:              z.coerce.number().default(1),
  limit:             z.coerce.number().max(48).default(24),
  'filter[fabric]':  z.string().optional(),
  'filter[brand_id]':z.string().uuid().optional(),
  'filter[sale_active]': z.coerce.boolean().optional(),
  sort:              z.enum(['created_at:desc', 'price:asc', 'price:desc']).default('created_at:desc'),
});
```

## BullMQ Producer Pattern

```typescript
// After placing an order — fire-and-forget, never await in the HTTP request
await orderNotifQueue.add('order_confirmed', {
  orderId: order.id,
  userId:  order.userId,
  // RULE 5: never include mobile/email in queue payload — worker fetches from DB
});
// Return response immediately — notification happens async
```

## Error Codes Reference (most common)

```typescript
// From @fs/shared/errors — ErrorCode enum
PRODUCT_NOT_FOUND       // 404
ORDER_NOT_FOUND         // 404 — also used for IDOR (wrong user)
VARIANT_NOT_FOUND       // 404
STOCK_UNAVAILABLE       // 409 — only at ORD-01, not at cart add
VALIDATION_ERROR        // 400 — Zod failures
OTP_INVALID             // 401
OTP_EXPIRED             // 401
JWT_EXPIRED             // 401
INSUFFICIENT_ROLE       // 403
COUPON_MIN_ORDER        // 400 — with meta.shortfall
PAYMENT_FAILED          // 402
```
