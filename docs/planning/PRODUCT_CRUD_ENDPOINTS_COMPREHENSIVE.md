# FabricSpeaks Product-Related CRUD Endpoints - Comprehensive Map

**Last Updated:** April 2, 2026  
**Coverage:** All services including admin-service, catalog-service, inventory-service, cart-service, and order-service

---

## 1. PRODUCT CREATE ENDPOINTS

### 1.1 Primary: Create Product with Variants
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L89-L97)  
**Endpoint:** `POST /api/v1/admin/products`  
**Controller:** [CatalogController.createProduct](services/catalog-service/src/controllers/catalog.controller.ts#L158-L161)  
**Service:** [CatalogService.createProduct(dto, adminId)](services/catalog-service/src/services/catalog.service.ts#L156)  
**Repository:** [ProductRepository.create(dto)](services/catalog-service/src/repositories/product.repository.ts#L199)  
**Role Requirements:** `superAdmin` | `inventoryManager`  
**Schema:** [CreateProductSchema](services/catalog-service/src/schemas/catalog.schemas.ts#L56)

**Request Body:**
```typescript
{
  name: string;              // min 3, max 200 chars
  slug: string;              // regex: ^[a-z0-9-]+$
  brandId: UUID;
  categoryId: UUID;
  description?: string;
  fabricDetails?: string;
  careGuide?: string;
  // USP/Fabric Fields (required):
  fabricType: string;        // e.g., "100% Linen"
  gsmWeight: number;         // positive int
  weaveType: string;         // e.g., "Plain weave"
  breathabilityRating: string; // e.g., "High"
  careInstructions: string;
  fabricOrigin: string;      // e.g., "India"
  attributes?: Record<string, unknown>;
  manualBadgesJson?: Array<{ type: string }>;
  variants: [              // At least 1 required
    {
      sku: string;
      size: string;
      colour: string;
      sizeLabel: string;
      basePrice: number;    // positive
      priceOverride?: number;
      salePrice?: number;   // required if saleActive=true
      saleActive?: boolean; // default false
      qty: number;          // non-negative int
      images?: Array<{url: URL, alt?: string, order: number}>;
      badges?: Record<string, unknown>;
      isActive?: boolean;   // default true
    }
  ]
}
```

**Response:** 201 Created
```typescript
{
  success: true;
  data: {
    id: UUID;
    name: string;
    slug: string;
    brandId: UUID;
    categoryId: UUID;
    // ... all product fields
    createdAt: ISO8601;
    updatedAt: ISO8601;
  }
}
```

**Audit Trail Logged:** Yes - action: "product.create" with variant count

---

## 2. PRODUCT READ ENDPOINTS

### 2.1 List Products (Customer - Public)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L60)  
**Endpoint:** `GET /api/v1/products`  
**Controller:** [CatalogController.listProducts](services/catalog-service/src/controllers/catalog.controller.ts#L71-L82)  
**Service:** [CatalogService.listProducts(filters)](services/catalog-service/src/services/catalog.service.ts#L51)  
**Repository:** [ProductRepository.findAll(filters)](services/catalog-service/src/repositories/product.repository.ts#L48-L118)  
**Auth:** Public  
**Cache:** 5 minutes (Redis key: `catalog:list:{filters}`)

**Query Parameters:**
```typescript
{
  cursor?: UUID;           // cursor-based pagination (alternative to page)
  page?: number;           // default: 1, page-based pagination
  limit?: number;          // default: 24, max: 100
  search?: string;         // full-text search on name + fabric_type
  fabric?: string;         // filter by fabric attribute
  brand?: UUID;            // filter by brand_id
  minPrice?: number;       // filter by variant basePrice >= minPrice
  maxPrice?: number;       // filter by variant basePrice <= maxPrice
  size?: string;           // filter by variant size
  colour?: string;         // filter by variant colour  
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: [
    {
      id: UUID;
      name: string;
      slug: string;
      brand: { id: UUID; name: string; slug: string };
      fabricType: string;
      variants: [
        {
          id: UUID;
          size: string;
          sizeLabel: string;
          effectivePrice: number;  // server-calculated
          originalPrice: number;
          isOnSale: boolean;
          qty: number;
          images: Array<{ url: string; alt: string }>;
          badges: string[];
        }
      ];
      isWishlisted?: boolean; // null if not authenticated
    }
  ];
  meta: {
    page?: number;
    limit: number;
    total?: number;
    hasNext?: boolean;
    nextCursor?: UUID;
  }
}
```

---

### 2.2 Get Product by Slug (Customer - Public)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L61)  
**Endpoint:** `GET /api/v1/products/:slug`  
**Controller:** [CatalogController.getProduct](services/catalog-service/src/controllers/catalog.controller.ts#L84-L86)  
**Service:** [CatalogService.getProductBySlug(slug)](services/catalog-service/src/services/catalog.service.ts#L132-L153)  
**Repository:** [ProductRepository.findBySlug(slug)](services/catalog-service/src/repositories/product.repository.ts#L40-L46)  
**Auth:** Public  
**Cache:** 5 minutes (Redis key: `catalog:product:{slug}`)  
**Error:** PRODUCT_NOT_FOUND (404) if not found or is_deleted=true

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    id: UUID;
    name: string;
    slug: string;
    brand: {
      id: UUID;
      name: string;
      slug: string;
      story?: string;
      logoUrl?: string;
    };
    category: { id: UUID; name: string; slug: string };
    description: string;
    fabricDetails: string;
    careGuide: string;
    // USP fields embedded in attributes JSONB:
    attributes: {
      fabric_type: string;
      gsm_weight: number;
      weave_type: string;
      breathability_rating: string;
      care_instructions: string;
      fabric_origin: string;
    };
    manualBadges: string[];  // e.g., ["best_seller", "premium"]
    variants: [
      {
        id: UUID;
        sku: string;
        size: string;
        colour: string;
        sizeLabel: string;
        effectivePrice: number;
        originalPrice: number;
        isOnSale: boolean;
        saleEndsAt?: ISO8601;
        qty: number;
        isOos: boolean;
        images: Array<{ url: string; alt: string; order: number }>;
        badges: string[];
      }
    ];
    reviewSummary: {
      avgRating: number;
      totalCount: number;
    };
    isWishlisted: boolean;  // false if not auth
  }
}
```

---

### 2.3 Admin List Products (Admin - With Full Details)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L67-L73)  
**Endpoint:** `GET /api/v1/admin/products`  
**Controller:** [CatalogController.adminListProducts](services/catalog-service/src/controllers/catalog.controller.ts#L129-L140)  
**Service:** [CatalogService.adminListProducts(filters)](services/catalog-service/src/services/catalog.service.ts#L99-L130)  
**Repository:** [ProductRepository.findAllAdmin(filters)](services/catalog-service/src/repositories/product.repository.ts#L144-L219)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager` | `supportAgent` (read-only for support)  
**Cache:** None (bypasses cache)

**Query Parameters:**
```typescript
{
  page?: number;              // default: 1
  limit?: number;             // default: 20, max: 100
  search?: string;            // search by name or slug
  'filter[is_active]'?: 'true'|'false';
  'filter[brand_id]'?: UUID;
  'filter[has_sale]'?: 'true'|'false'; // filter by sale_active on variants
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: [
    {
      id: UUID;
      name: string;
      slug: string;
      isActive: boolean;
      brandId: UUID;
      categoryId: UUID;
      variants: [
        {
          id: UUID;
          sku: string;
          size: string;
          colour: string;
          qty: number;
          basePrice: number;
          salePrice?: number;
          saleActive: boolean;
          priceOverride?: number;
          isActive: boolean;
        }
      ];
      createdAt: ISO8601;
      updatedAt: ISO8601;
    }
  ];
  meta: {
    page: number;
    limit: number;
    total: number;
  }
}
```

---

### 2.4 Get Product by ID (Internal - Used by Catalog Service)
**Method:** [ProductRepository.findById(id)](services/catalog-service/src/repositories/product.repository.ts#L16-L24)  
**Returns:** `Product | null`

---

## 3. PRODUCT UPDATE ENDPOINTS

### 3.1 Update Product (Partial Fields)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L100-L106)  
**Endpoint:** `PUT /api/v1/admin/products/:id`  
**Controller:** [CatalogController.updateProduct](services/catalog-service/src/controllers/catalog.controller.ts#L164-L169)  
**Service:** [CatalogService.updateProduct(id, dto, adminId)](services/catalog-service/src/services/catalog.service.ts#L176-L195)  
**Repository:** [ProductRepository.update(id, dto)](services/catalog-service/src/repositories/product.repository.ts#L237)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`  
**Error:** PRODUCT_NOT_FOUND (404)

**Request Body:** (All fields optional)
```typescript
{
  name?: string;
  slug?: string;
  description?: string;
  fabricDetails?: string;
  careGuide?: string;
  fabricType?: string;
  gsmWeight?: number;
  weaveType?: string;
  breathabilityRating?: string;
  careInstructions?: string;
  fabricOrigin?: string;
  attributes?: Record<string, unknown>;
  manualBadgesJson?: Array<{ type: string }>;
}
```

**Response:** 200 OK (same shape as product GET)

**Audit Trail Logged:** Yes - action: "product.update" with before/after JSON

**Cache Invalidated:**
- `catalog:list:*` (all list filters)
- `catalog:product:{slug}`

---

### 3.2 Replace Product (Full Deactivation - Preferred: PATCH Deactivate)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L127-L133)  
**Endpoint:** `PUT /api/v1/admin/products/:id/deactivate`  
**Controller:** [CatalogController.deactivateProduct](services/catalog-service/src/controllers/catalog.controller.ts#L185-L189)  
**Service:** [CatalogService.deactivateProduct(id, {confirm}, adminId)](services/catalog-service/src/services/catalog.service.ts#L217)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`  
**Errors:**
- PRODUCT_NOT_FOUND (404)
- PRODUCT_HAS_PENDING_ORDERS (409) - if confirm=false but pending orders exist

**Request Body:**
```typescript
{
  confirm: boolean;  // Must be true if product has pending orders
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    deactivated: true;
    pendingOrderCount: number;
    wishlistNotificationsSent: number;
  }
}
```

**Side Effects:**
- Sets `is_active = false` on product
- Sets all variants to `is_active = false`
- If pending orders exist: returns 409 unless confirm=true
- Sends WhatsApp to all wishlist subscribers (if any)
- Queues BullMQ jobs for notifications

---

## 4. PRODUCT DELETE ENDPOINTS

### 4.1 Hard Delete Product (Soft Delete - Sets is_deleted Flag)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L120-L126)  
**Endpoint:** `DELETE /api/v1/admin/products/:id`  
**Controller:** [CatalogController.deleteProduct](services/catalog-service/src/controllers/catalog.controller.ts#L198-L203)  
**Service:** [CatalogService.deleteProduct(id, adminId)](services/catalog-service/src/services/catalog.service.ts#L223-L239)  
**Repository:** [ProductRepository.softDelete(id)](services/catalog-service/src/repositories/product.repository.ts#L311)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`  
**Error:** PRODUCT_NOT_FOUND (404), PRODUCT_HAS_PENDING_ORDERS (409)

**Response:** 200 OK
```typescript
{
  success: true
}
```

**What it does:**
- Sets `is_deleted = true` on product
- CASCADE: Sets `is_deleted = true` on all related variants
- CASCADE: Sets `is_active = false` on product and all variants
- Audit log entry written
- Cache invalidated

**SQL:**
```sql
UPDATE products 
SET is_deleted = true, is_active = false, updated_at = now() 
WHERE id = $1;

UPDATE variants 
SET is_deleted = true, is_active = false, updated_at = now() 
WHERE product_id = $1;
```

---

## 5. VARIANT MANAGEMENT ENDPOINTS

### 5.1 Create Variant for Existing Product
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L108-L114)  
**Endpoint:** `POST /api/v1/admin/products/:id/variants`  
**Controller:** [CatalogController.createVariant](services/catalog-service/src/controllers/catalog.controller.ts#L182-L186)  
**Service:** [CatalogService.createVariant(productId, dto, adminId)](services/catalog-service/src/services/catalog.service.ts#L269)  
**Repository:** [VariantRepository.create(dto)](services/catalog-service/src/repositories/variant.repository.ts#L59-L85)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`

**Request Body:**
```typescript
{
  size: string;
  colour: string;
  sizeLabel: string;
  basePrice: number;
  priceOverride?: number;
  salePrice?: number;
  saleActive?: boolean;
  images?: Array<{ url: URL; alt?: string; order: number }>;
}
```

**Response:** 201 Created (Variant object)

---

### 5.2 Bulk Update Variants (Multiple Size/Color/Price Changes)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L115-L121)  
**Endpoint:** `PUT /api/v1/admin/products/:id/variants/bulk`  
**Controller:** [CatalogController.bulkUpdateVariants](services/catalog-service/src/controllers/catalog.controller.ts#L171-L176)  
**Service:** [CatalogService.bulkUpdateVariants(productId, updates, adminId)](services/catalog-service/src/services/catalog.service.ts#L309)  
**Repository:** [VariantRepository.bulkUpdate(updates)](services/catalog-service/src/repositories/variant.repository.ts#L116-L184)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`

**Request Body:**
```typescript
{
  variants: [
    {
      variantId: UUID;
      size?: string;
      colour?: string;
      sizeLabel?: string;
      basePrice?: number;
      priceOverride?: number;
      salePrice?: number;
      saleActive?: boolean;
      qty?: number;
      isActive?: boolean;
      badges?: Record<string, unknown>;
      images?: Array<{ url: string; alt?: string; order: number }>;
    }
  ];
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    updatedCount: number;
    variants: Array<Variant>;
  }
}
```

**Audit Trail:** Yes - per variant, batched write

---

### 5.3 Update Single Variant
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L122-L128)  
**Endpoint:** `PUT /api/v1/admin/variants/:variantId`  
**Controller:** [CatalogController.updateVariant](services/catalog-service/src/controllers/catalog.controller.ts#L190-L195)  
**Service:** [CatalogService.updateVariant(variantId, dto, adminId)](services/catalog-service/src/services/catalog.service.ts#L350)  
**Repository:** [VariantRepository.updateById(id, dto)](services/catalog-service/src/repositories/variant.repository.ts#L193-L241)

**Request Body:** Same as bulk update for single variant

---

### 5.4 Deactivate Single Variant
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L129-L135)  
**Endpoint:** `DELETE /api/v1/admin/variants/:variantId`  
**Controller:** [CatalogController.deactivateVariant](services/catalog-service/src/controllers/catalog.controller.ts#L197-L200)  
**Service:** [CatalogService.deactivateVariant(variantId, adminId)](services/catalog-service/src/services/catalog.service.ts#L353)

**Response:** 200 OK

---

## 6. BULK UPDATE ENDPOINTS (Advanced)

### 6.1 Bulk Price Update (Global or Targeted)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L158-L164)  
**Endpoint:** `PUT /api/v1/admin/pricing/bulk-update`  
**Controller:** [CatalogController.bulkPriceUpdate](services/catalog-service/src/controllers/catalog.controller.ts#L229-L236)  
**Service:** [CatalogService.bulkUpdatePrices(dto, adminId)](services/catalog-service/src/services/catalog.service.ts#L364)  
**Auth:** Required  
**Roles:** `superAdmin` (pricing control)

**Request Body:**
```typescript
{
  targetType: 'product' | 'variant' | 'collection' | 'brand' | 'global';
  targetIds: UUID[];           // [] for global, required for others
  adjustmentType: 'PERCENT' | 'FIXED';
  adjustmentValue: number;     // negative for discount
  applyTo: 'base_price' | 'price_override'; // default: base_price
  dryRun?: boolean;            // preview only, don't apply
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    updatedCount: number;
    affectedIds: UUID[];
    adjustments?: Array<{  // if dryRun=true
      id: UUID;
      before: number;
      after: number;
    }>;
  }
}
```

**Audit Trail:** Yes - "pricing.bulk_update"

---

### 6.2 Schedule Price Change (For Future Date)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L165-L171)  
**Endpoint:** `POST /api/v1/admin/pricing/schedule`  
**Controller:** [CatalogController.schedulePriceChange](services/catalog-service/src/controllers/catalog.controller.ts#L238-L251)  
**Service:** [PriceChangeService.schedulePriceChange({...}, adminId)](services/catalog-service/src/services/)  
**Auth:** Required  
**Roles:** `superAdmin`

**Request Body:**
```typescript
{
  targetType: 'product' | 'variant' | 'collection' | 'brand' | 'global';
  targetIds: UUID[];
  adjustmentType: 'PERCENT' | 'FIXED';
  adjustmentValue: number;
  applyTo: 'base_price' | 'price_override';
  scheduledAt: ISO8601;  // Future datetime
}
```

**Side Effects:**
- Creates BullMQ scheduled job
- Job triggers at `scheduledAt` time
- Applies price changes automatically

---

### 6.3 Bulk Upload Products (CSV)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L139-L149)  
**Endpoint:** `POST /api/v1/admin/products/bulk-upload`  
**Controller:** [CatalogController.bulkUpload](services/catalog-service/src/controllers/catalog.controller.ts#L206-L222)  
**Service:** [BulkUploadService.queueUpload(csvData, userId, dryRun)](services/catalog-service/src/services/bulk-upload.service.ts)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`  
**Rate Limit:** 5 requests per minute

**Request Body:**
```typescript
{
  csvData: string;  // CSV content (max 10MB)
  dryRun?: boolean; // Validate only, don't insert
}
```

**CSV Columns Required:**
```
name, sku, size, colour, base_price, qty,
fabric_type, gsm_weight, weave_type, breathability_rating,
care_instructions, fabric_origin
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    jobId: UUID;
    status: 'queued';
    message: 'Bulk upload queued for processing';
  }
}
```

**Processing:** Async via BullMQ (bulk-upload queue)

---

### 6.4 Get Bulk Upload Template (CSV)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L150-L155)  
**Endpoint:** `GET /api/v1/admin/products/bulk-upload/template`  
**Controller:** [CatalogController.getBulkTemplate](services/catalog-service/src/controllers/catalog.controller.ts#L253-L258)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`

**Response:** 200 OK
- Content-Type: `text/csv`
- Download filename: `catalog_template.csv`
- Contains header row + 1 example row

---

### 6.5 Duplicate Product (Create Draft Copy)
**File:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts#L136-L142)  
**Endpoint:** `POST /api/v1/admin/products/:id/duplicate`  
**Controller:** [CatalogController.duplicateProduct](services/catalog-service/src/controllers/catalog.controller.ts#L204-L207)  
**Service:** [CatalogService.duplicateProduct(id, adminId)](services/catalog-service/src/services/catalog.service.ts#L241)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`

**Response:** 201 Created
```typescript
{
  success: true;
  data: {
    id: UUID;  // New product UUID
    slug: string;  // original-slug-copy
    status: 'draft';  // is_active=false
    duplicateOf?: UUID;  // FK reference to original
  }
}
```

**What it does:**
- Copies all product fields except ID and timestamps
- Copies all variants (SKU +"-copy" suffix)
- URL images referenced (not re-downloaded)
- Creates with `is_active = false`
- Audit log entry

---

## 7. STOCK/INVENTORY MANAGEMENT ENDPOINTS

### 7.1 List Inventory (Stock Levels by Variant)
**File:** [services/inventory-service/src/routes/inventory.routes.ts](services/inventory-service/src/routes/inventory.routes.ts#L43)  
**Endpoint:** `GET /api/v1/inventory`  
**Controller:** [InventoryController.listInventory](services/inventory-service/src/controllers/)  
**Service:** [InventoryService.listInventory()](#)  
**Repository:** [InventoryRepository.getInventory()](services/inventory-service/src/repositories/inventory.repository.ts)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager` | `supportAgent`  
**Support Agents:** Limited view (qty + stockStatus only)

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  'filter[product_id]'?: UUID;
  'filter[sku]'?: string;
  'filter[stock_status]'?: 'in_stock' | 'low_stock' | 'oos';
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: [
    {
      variantId: UUID;
      sku: string;
      productName: string;
      size: string;
      colour: string;
      qty: number;
      stockStatus: 'in_stock' | 'low_stock' | 'oos';
      lastAdjustedAt: ISO8601;
    }
  ];
  meta: {
    total: number;
    page: number;
    limit: number;
  }
}
```

---

### 7.2 Manual Stock Adjustment (INSERT-ONLY Audit Trail)
**File:** [services/inventory-service/src/routes/inventory.routes.ts](services/inventory-service/src/routes/inventory.routes.ts#L46)  
**Endpoint:** `POST /api/v1/inventory/:variantId`  
**Controller:** [InventoryController.manualAdjustment](services/inventory-service/src/controllers/)  
**Service:** [InventoryService.adjustStock(variantId, delta, reason, notes)](services/inventory-service/src/services/)  
**Repository:** [InventoryRepository.adjustStock()](services/inventory-service/src/repositories/inventory.repository.ts)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`

**Request Body:**
```typescript
{
  quantityDelta: number;  // Positive or negative, non-zero
  reason: 'purchase' | 'return' | 'damage' | 'theft' | 'count_correction' | 'initial_stock' | 'transfer_in' | 'transfer_out';
  notes?: string;         // max 500 chars
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    variantId: UUID;
    previousQty: number;
    newQty: number;
    stockReplenished: boolean;  // true if was 0, now > 0
  }
}
```

**Audit Trail:**
```sql
INSERT INTO stock_adjustments (
  variant_id, previous_qty, new_qty, delta,
  reason, notes, adjusted_by_admin_id, adjusted_at
) VALUES (...)
```

**Side Effects:**
- If `stockReplenished = true`: Trigger STOCK_REPLENISHED event → Notify "Notify Me" subscribers via WhatsApp
- Cache invalidated
- Inventory health dashboard updated

---

### 7.3 Stock Adjustment History
**File:** [services/inventory-service/src/routes/inventory.routes.ts](#)  
**Endpoint:** `GET /api/v1/inventory/:variantId/adjustments`  
**Controller:** [InventoryController.getAdjustmentHistory](#)  
**Repository:** [InventoryRepository.findAdjustments(variantId)](services/inventory-service/src/repositories/inventory.repository.ts)

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  'filter[created_at_from]'?: ISO8601;
  'filter[created_at_to]'?: ISO8601;
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: [
    {
      id: UUID;
      previousQty: number;
      newQty: number;
      delta: number;
      reason: string;
      notes: string;
      adminName: string;  // First + Last initial
      createdAt: ISO8601;
    }
  ];
  meta: {
    total: number;
    page: number;
  }
}
```

**Note:** Immutable read-only table - no updates or deletes ever

---

### 7.4 Set Expected Stock Arrival
**File:** [services/inventory-service/src/routes/inventory.routes.ts](#)  
**Endpoint:** `POST /api/v1/inventory/expected`  
**Controller:** [InventoryController.addExpectedArrival](#)

**Request Body:**
```typescript
{
  variantId: UUID;
  expectedQty: number;
  expectedDate: ISO8601;
  notes?: string;
}
```

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    id: UUID;
    expectedDate: ISO8601;
    expectedQty: number;
  }
}
```

**Side Effects:**
- Creates BullMQ job for `expectedDate` at 08:00 IST
- Job sends WA reminder to inventoryManager

---

### 7.5 Stock Health Dashboard
**File:** [services/inventory-service/src/routes/inventory.routes.ts](#)  
**Endpoint:** `GET /api/v1/inventory/health`  
**Controller:** [InventoryController.getHealth](#)  
**Service:** [InventoryService.getInventoryHealth()](#)  
**Cache:** 5 minutes (Redis)

**Response:** 200 OK
```typescript
{
  success: true;
  data: {
    items: [
      {
        variantId: UUID;
        sku: string;
        qty: number;
        status: 'green' | 'amber' | 'red';  // > threshold | ≤ threshold | 0
        threshold: number;
        expectedStockDate?: ISO8601;
      }
    ];
    summary: {
      greenCount: number;
      amberCount: number;
      redCount: number;
    }
  }
}
```

**Status Logic:**
- **Green:** `qty > low_stock_threshold`
- **Amber:** `0 < qty ≤ threshold`
- **Red:** `qty = 0`

---

### 7.6 Bulk Stock Adjustment (CSV Upload)
**File:** [services/inventory-service/src/routes/inventory.routes.ts](#)  
**Endpoint:** `POST /api/v1/inventory/adjustment/bulk`  
**Method:** multipart/form-data with file upload  
**Controller:** [InventoryController.bulkAdjustment](#)  
**Auth:** Required  
**Roles:** `superAdmin` | `inventoryManager`

**Form Data:**
```
file: CSV
  Columns: sku, quantity_delta, reason, notes
```

---

## 8. SERVICES THAT HANDLE PRODUCTS

### 8.1 CatalogService
**File:** [services/catalog-service/src/services/catalog.service.ts](services/catalog-service/src/services/catalog.service.ts)

**Key Methods:**
- `listProducts(filters)` → Paginated with Redis cache
- `adminListProducts(filters)` → No cache, admin filters
- `getProductBySlug(slug)` → With cache
- `createProduct(dto, adminId)` → Transaction + variants
- `updateProduct(id, dto, adminId)`
- `deleteProduct(id, adminId)` → Soft delete
- `deactivateProduct(id, {confirm}, adminId)`
- `duplicateProduct(id, adminId)`
- `createVariant(productId, dto, adminId)`
- `bulkUpdateVariants(productId, updates, adminId)`
- `bulkUpdatePrices(dto, adminId)` → Supports global or targeted
- `flattenFabricFields(product)` → Helper for USP fields

---

### 8.2 InventoryService
**File:** [services/inventory-service/src/services/inventory.service.ts](services/inventory-service/src/services/inventory.service.ts)

**Key Methods:**
- `listInventory()` → Paginated with optional filters
- `adjustStock(variantId, delta, reason, notes)` → INSERT-only audit
- `getHealth()` → Stock health with redis cache
- `addExpectedArrival(variantId, qty, date, notes)` → BullMQ scheduler
- `markArrivalReceived(id)` → Trigger stock replenishment
- `getVelocity()` → Sales velocity metric
- `getRestockSuggestions()` → AI-based reorder point

---

### 8.3 BulkUploadService
**File:** [services/catalog-service/src/services/bulk-upload.service.ts](services/catalog-service/src/services/bulk-upload.service.ts)

**Key Methods:**
- `queueUpload(csvData, userId, dryRun)` → BullMQ async job
- `getTemplateCsv()` → Sample CSV

---

### 8.4 PriceChangeService
**File:** [services/catalog-service/src/services/price-change.service.ts](services/catalog-service/src/services/)

**Key Methods:**
- `bulkUpdatePrices(dto, adminId)` → Immediate or scheduled
- `schedulePriceChange(dto, adminId)` → BullMQ scheduled job
- `listScheduled(query)` → View pending price changes

---

### 8.5 CartIntegrationService
**File:** [services/cart-service/src/services/catalog-integration.service.ts](services/cart-service/src/services/catalog-integration.service.ts)

**Key Methods:**
- `getVariantStockDetails(variantId)` → GET `/internal/variants/{variantId}`
  - Returns: `{ stock_qty: number; price: number }`
  - Called on every cart operation for stock + price validation

---

## 9. REPOSITORIES FOR PRODUCTS

### 9.1 ProductRepository
**File:** [services/catalog-service/src/repositories/product.repository.ts](services/catalog-service/src/repositories/product.repository.ts)

**Methods:**
| Method | Returns | Purpose |
|--------|---------|---------|
| `findById(id)` | `Product \| null` | Get by UUID |
| `findBySlug(slug)` | `Product \| null` | Get by URL slug |
| `findAll(filters)` | `{items, total?, hasNext?}` | Paginated list (cursor or page-based) |
| `findAllAdmin(filters)` | `{items, total}` | Admin list with active/sale filters |
| `create(dto)` | `Product` | Insert, maps fabric fields to JSONB attributes |
| `update(id, dto)` | `Product` | Patch update, merges fabric fields |
| `softDelete(id)` | `void` | Sets is_deleted=true, cascades to variants |
| `withTransaction(callback)` | `T` | Wraps operations in DB transaction |

---

### 9.2 VariantRepository
**File:** [services/catalog-service/src/repositories/variant.repository.ts](services/catalog-service/src/repositories/variant.repository.ts)

**Methods:**
| Method | Returns | Purpose |
|--------|---------|---------|
| `findById(id)` | `Variant \| null` | Single variant |
| `findByProductId(productId)` | `Variant[]` | All variants for product |
| `findByProductIds(productIds)` | `Record<string, Variant[]>` | Batch query for N products → map |
| `findBySku(sku)` | `Variant \| null` | Lookup by SKU |
| `create(dto)` | `Variant` | Insert single |
| `bulkCreate(productId, variants)` | `Variant[]` | Insert multiple for product |
| `bulkUpdate(updates)` | `Variant[]` | Partial update on multiple |
| `updateById(id, dto)` | `Variant` | Single partial update |
| `updateStock(id, qty)` | `void` | Set qty directly (used by inventory service) |
| `verifyBelongToProduct(variantIds, productId)` | `boolean` | Ownership verification |

---

### 9.3 InventoryRepository
**File:** [services/inventory-service/src/repositories/inventory.repository.ts](services/inventory-service/src/repositories/inventory.repository.ts)

**Methods:**
| Method | Returns | Purpose |
|--------|---------|---------|
| `getInventory()` | `VariantStock[]` | Current stock levels |
| `adjustStock(variantId, delta, reason)` | `void` | INSERT into audit table |
| `findAdjustments(variantId, filters)` | `StockAdjustment[]` | Immutable audit trail |
| `getInventoryWithSalesData()` | `VariantStock[]` | With velocity metrics |

---

### 9.4 AuditLogRepository
**File:** [services/catalog-service/src/repositories/audit_log.repository.ts](services/catalog-service/src/repositories/audit_log.repository.ts)

**Methods:**
- `insert({adminId, action, entityType, entityId, beforeJson, afterJson})` → INSERT-only immutable log

---

## 10. CONTROLLERS THAT EXPOSE PRODUCT ENDPOINTS

### 10.1 CatalogController
**File:** [services/catalog-service/src/controllers/catalog.controller.ts](services/catalog-service/src/controllers/catalog.controller.ts)

**Endpoints Exposed:**
| Method | Endpoint | HTTP |
|--------|----------|------|
| `listProducts` | GET /api/v1/products | GET |
| `getProduct` | GET /api/v1/products/:slug | GET |
| `adminListProducts` | GET /api/v1/admin/products | GET |
| `createProduct` | POST /api/v1/admin/products | POST |
| `updateProduct` | PUT /api/v1/admin/products/:id | PUT |
| `deleteProduct` | DELETE /api/v1/admin/products/:id | DELETE |
| `deactivateProduct` | PUT /api/v1/admin/products/:id/deactivate | PUT |
| `duplicateProduct` | POST /api/v1/admin/products/:id/duplicate | POST |
| `createVariant` | POST /api/v1/admin/products/:id/variants | POST |
| `updateVariant` | PUT /api/v1/admin/variants/:variantId | PUT |
| `deactivateVariant` | DELETE /api/v1/admin/variants/:variantId | DELETE |
| `bulkUpdateVariants` | PUT /api/v1/admin/products/:id/variants/bulk | PUT |
| `bulkPriceUpdate` | PUT /api/v1/admin/pricing/bulk-update | PUT |
| `schedulePriceChange` | POST /api/v1/admin/pricing/schedule | POST |
| `bulkUpload` | POST /api/v1/admin/products/bulk-upload | POST |
| `getBulkTemplate` | GET /api/v1/admin/products/bulk-upload/template | GET |

---

### 10.2 InventoryController
**File:** [services/inventory-service/src/controllers/inventory.controller.ts](services/inventory-service/src/controllers/)

**Endpoints Exposed:**
| Method | Endpoint | HTTP |
|--------|----------|------|
| `listInventory` | GET /api/v1/inventory | GET |
| `manualAdjustment` | POST /api/v1/inventory/:variantId | POST |
| `updateThreshold` | PATCH /api/v1/inventory/:variantId/threshold | PATCH |
| `bulkAdjustment` | POST /api/v1/inventory/adjustment/bulk | POST |
| `getExpectedArrivals` | GET /api/v1/inventory/expected | GET |
| `addExpectedArrival` | POST /api/v1/inventory/expected | POST |
| `markArrivalReceived` | PATCH /api/v1/inventory/expected/:id/receive | PATCH |
| `getHealth` | GET /api/v1/inventory/health | GET |
| `getVelocity` | GET /api/v1/inventory/velocity | GET |
| `getRestockSuggestions` | GET /api/v1/inventory/suggestions | GET |
| `getDeadStock` | GET /api/v1/inventory/dead-stock | GET |
| `getDemandPatterns` | GET /api/v1/inventory/demand-patterns | GET |

---

## 11. VALIDATION SCHEMAS

### 11.1 Product Schema
**File:** [services/catalog-service/src/schemas/catalog.schemas.ts](services/catalog-service/src/schemas/catalog.schemas.ts#L56-L78)

```typescript
export const CreateProductSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  description: z.string().optional(),
  fabricDetails: z.string().optional(),
  careGuide: z.string().optional(),
  // USP Fields - REQUIRED
  fabricType: z.string().min(1),
  gsmWeight: z.number().int().positive(),
  weaveType: z.string().min(1),
  breathabilityRating: z.string().min(1),
  careInstructions: z.string().min(1),
  fabricOrigin: z.string().min(1),
  attributes: z.record(z.unknown()).default({}),
  manualBadgesJson: z.array(z.object({type: z.string()})).optional(),
  variants: z.array(VariantItemSchema).min(1),  // At least 1
});
```

### 11.2 Variant Schema
**File:** [services/catalog-service/src/schemas/catalog.schemas.ts](services/catalog-service/src/schemas/catalog.schemas.ts#L1-L55)

```typescript
export const VariantItemSchema = z.object({
  sku: z.string().min(1).max(100),
  size: z.string().max(20).optional(),
  colour: z.string().max(50).optional(),
  sizeLabel: z.string().max(30).optional(),
  basePrice: z.number().positive(),
  priceOverride: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  saleActive: z.boolean().default(false),
  qty: z.number().int().nonnegative(),
  badges: z.record(z.unknown()).optional(),
  images: z.array(z.union([z.string().url(), z.record(z.unknown())])).default([]),
  isActive: z.boolean().default(true),
});

// saleActive=true requires salePrice
export const CreateVariantSchema = CreateVariantSchemaBase.refine(
  (data) => !data.saleActive || Boolean(data.salePrice),
  { message: 'salePrice required when saleActive=true' }
);
```

---

## 12. ERROR CODES SPECIFIC TO PRODUCTS

| ErrorCode | HTTP | When Thrown | Endpoint(s) |
|-----------|------|-------------|------------|
| `PRODUCT_NOT_FOUND` | 404 | Product doesn't exist or is_deleted=true | GET, PUT, DELETE, CREATE_VARIANT |
| `VARIANT_NOT_FOUND` | 404 | Variant doesn't exist | PUT /variants, DELETE /variants, stock adjust |
| `PRODUCT_HAS_PENDING_ORDERS` | 409 | Cannot deactivate if pending orders exist | DELETE, deactivate |
| `STOCK_UNAVAILABLE` | 409 | Quantity exceeds available stock | Cart add, order place |
| `VALIDATION_ERROR` | 400 | Invalid request body | All POST/PUT |
| `INSUFFICIENT_ROLE` | 403 | User lacks permission | All admin/* endpoints |
| `BULK_UPLOAD_LIMIT` | 413 | CSV file > 10MB | Bulk upload |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many bulk requests (5/min) | Bulk operations |
| `INTERNAL_ERROR` | 500 | Unhandled exception | All (Sentry captured) |

---

## 13. QUICK REFERENCE - CRUD MATRIX

| Operation | Endpoint | HTTP | Auth | Role |
|-----------|----------|------|------|------|
| **CREATE** |
| Create Product | `/admin/products` | POST | ✓ | SA, IM |
| Create Variant | `/admin/products/:id/variants` | POST | ✓ | SA, IM |
| **READ** |
| List Products | `/products` | GET | ✗ | — |
| Get Product | `/products/:slug` | GET | ✗ | — |
| Admin List Products | `/admin/products` | GET | ✓ | SA, IM, SA |
| **UPDATE** |
| Update Product | `/admin/products/:id` | PUT | ✓ | SA, IM |
| Update Variant | `/admin/variants/:variantId` | PUT | ✓ | SA, IM |
| Bulk Variant Update | `/admin/products/:id/variants/bulk` | PUT | ✓ | SA, IM |
| Deactivate Product | `/admin/products/:id/deactivate` | PUT | ✓ | SA, IM |
| **DELETE** |
| Delete Product | `/admin/products/:id` | DELETE | ✓ | SA, IM |
| Deactivate Variant | `/admin/variants/:variantId` | DELETE | ✓ | SA, IM |
| **ADVANCED** |
| Bulk Price Update | `/admin/pricing/bulk-update` | PUT | ✓ | SA |
| Schedule Price Change | `/admin/pricing/schedule` | POST | ✓ | SA |
| Duplicate Product | `/admin/products/:id/duplicate` | POST | ✓ | SA, IM |
| Bulk Upload (CSV) | `/admin/products/bulk-upload` | POST | ✓ | SA, IM |
| **INVENTORY** |
| List Inventory | `/inventory` | GET | ✓ | SA, IM, supportAgent |
| Adjust Stock | `/inventory/:variantId` | POST | ✓ | SA, IM |
| Stock Health | `/inventory/health` | GET | ✓ | SA, IM |

---

## 14. KEY ARCHITECTURAL PATTERNS

### Transactional Operations
Product creation uses transactions to ensure product + variants are created together:
```typescript
const product = await productRepo.withTransaction(async (client) => {
  const createdProduct = await productRepo.create(productPayload, client);
  await variantRepo.bulkCreate(createdProduct.id, variants, client);
  return createdProduct;
});
```

### Cache Invalidation Strategy
- List cache keys follow pattern: `catalog:list:{JSON.stringify(filters)}`
- Detail cache keys: `catalog:product:{slug}`
- TTL: 5 minutes
- Invalidated on: product create, update, delete

### Soft-Delete Pattern
```sql
UPDATE products SET is_deleted = true, is_active = false WHERE id = $1;
UPDATE variants SET is_deleted = true, is_active = false WHERE product_id = $1;
-- Preserves order history and foreign key relationships
```

### INSERT-ONLY Audit Table
```sql
INSERT INTO stock_adjustments (variant_id, previous_qty, new_qty, delta, reason, adjusted_by, adjusted_at)
VALUES (...)
-- SELECT only - never UPDATE or DELETE - immutable for compliance
```

### Price Calculation (Server-Side ONLY)
```typescript
const effectivePrice = getEffectivePrice({
  base_price: v.basePrice,
  sale_price: v.salePrice,
  price_override: v.priceOverride,
  sale_active: v.saleActive,
});
// Priority: sale_price (if sale_active) > price_override > base_price
// Client never sends price - always server-calculated
```

---

## 15. SUMMARY

**Total Endpoints:** 30+  
**Primary Service:** catalog-service (25 endpoints)  
**Supporting:** inventory-service (12 endpoints), cart-service (integration layer)  
**Auth Model:** JWT cookie (httpOnly, Secure, SameSite=Strict)  
**Role-Based Access:** 4 roles (customer, superAdmin, inventoryManager, supportAgent)  
**Audit Logging:** All admin mutations logged (INSERT-only table)  
**Caching:** Redis (5-min TTL for product lists/singles)  
**Async Jobs:** BullMQ for bulk uploads, price changes, stock notifications  
**Database:** PostgreSQL with JSONB for product attributes (USP fabric fields)

