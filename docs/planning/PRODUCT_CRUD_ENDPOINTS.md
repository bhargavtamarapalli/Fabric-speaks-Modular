# Product Management CRUD Endpoints - Complete Inventory

## Overview
This document lists all CRUD endpoints for product management across the FabricSpeaks microservices architecture. Endpoints are organized by service and operation type.

---

## 1. CATALOG SERVICE CRUD ENDPOINTS
**Base Path:** `/api/v1`  
**Service Location:** `services/catalog-service/src`

### 1.1 Product CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 1 | **GET** | `/products` | `catalogController.listProducts()` | catalog.routes.ts:L49 | None (Public) | List all products with pagination |
| 2 | **GET** | `/products/:slug` | `catalogController.getProduct()` | catalog.routes.ts:L50 | None (Public) | Get single product by slug |
| 3 | **GET** | `/admin/products` | `catalogController.adminListProducts()` | catalog.routes.ts:L54 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager', 'supportAgent')` | List products (admin view) |
| 4 | **POST** | `/admin/products` | `catalogController.createProduct()` | catalog.routes.ts:L55 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Create new product |
| 5 | **PATCH** | `/admin/products/:id` | `catalogController.updateProduct()` | catalog.routes.ts:L56 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Update product details |
| 6 | **DELETE** | `/admin/products/:id` | `catalogController.deleteProduct()` | catalog.routes.ts:L61 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Delete product |
| 7 | **POST** | `/admin/products/:id/duplicate` | `catalogController.duplicateProduct()` | catalog.routes.ts:L62 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Duplicate existing product |
| 8 | **POST** | `/admin/products/:id/deactivate` | `catalogController.deactivateProduct()` | catalog.routes.ts:L61 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Deactivate product |

**Validation Schemas:**
- Create: `CreateProductSchema`
- Update: `UpdateProductSchema`
- Deactivate: `DeactivateProductSchema`

**Associated Controller Methods:** catalog.controller.ts:L22-182

---

### 1.2 Variant/SKU CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 9 | **POST** | `/admin/products/:id/variants` | `catalogController.createVariant()` | catalog.routes.ts:L57 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Create product variant |
| 10 | **PATCH** | `/admin/variants/:variantId` | `catalogController.updateVariant()` | catalog.routes.ts:L59 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Update variant |
| 11 | **DELETE** | `/admin/variants/:variantId` | `catalogController.deactivateVariant()` | catalog.routes.ts:L60 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Deactivate variant |

**Bulk Variant Operations:**

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 12 | **PATCH** | `/admin/products/:id/variants/bulk` | `catalogController.bulkUpdateVariants()` | catalog.routes.ts:L58 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | **BULK** - Update multiple variants |

**Validation Schemas:**
- Create: `CreateVariantSchema`
- Update: `UpdateVariantSchema`
- Bulk Update: `BulkUpdateVariantsSchema`

**Associated Controller Methods:** catalog.controller.ts:L95-133

---

### 1.3 Brand CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 13 | **GET** | `/brands` | `catalogController.listBrands()` | catalog.routes.ts:L51 | None (Public) | List all brands |
| 14 | **GET** | `/admin/brands` | `catalogController.adminListBrands()` | catalog.routes.ts:L54 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | List brands (admin view) |
| 15 | **POST** | `/admin/brands` | `catalogController.createBrand()` | catalog.routes.ts:L67 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Create brand |
| 16 | **PATCH** | `/admin/brands/:id` | `catalogController.updateBrand()` | catalog.routes.ts:L68 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Update brand |

**Validation Schemas:**
- Create: `CreateBrandSchema`
- Update: `UpdateBrandSchema`

**Associated Controller Methods:** catalog.controller.ts:L165-179

---

### 1.4 Category CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 17 | **GET** | `/categories` | `catalogController.listCategories()` | catalog.routes.ts:L52 | None (Public) | List all categories |
| 18 | **GET** | `/admin/categories` | `catalogController.adminListCategories()` | catalog.routes.ts:L55 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | List categories (admin view) |
| 19 | **POST** | `/admin/categories` | `catalogController.createCategory()` | catalog.routes.ts:L70 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Create category |
| 20 | **PATCH** | `/admin/categories/:id` | `catalogController.updateCategory()` | catalog.routes.ts:L71 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Update category |

**Validation Schemas:**
- Create: `CreateCategorySchema`
- Update: `UpdateCategorySchema`

**Associated Controller Methods:** catalog.controller.ts:L196-210

---

### 1.5 Collection CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 21 | **GET** | `/collections/:slug` | `catalogController.getCollection()` | catalog.routes.ts:L53 | None (Public) | Get collection by slug |
| 22 | **GET** | `/admin/collections` | `catalogController.adminListCollections()` | catalog.routes.ts:L56 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | List collections (admin) |
| 23 | **POST** | `/admin/collections` | `catalogController.createCollection()` | catalog.routes.ts:L73 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Create collection |
| 24 | **PATCH** | `/admin/collections/:id` | `catalogController.updateCollection()` | catalog.routes.ts:L74 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Update collection |
| 25 | **POST** | `/admin/collections/:id/products` | `catalogController.addCollectionProducts()` | catalog.routes.ts:L75 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Add products to collection |
| 26 | **DELETE** | `/admin/collections/:id/products/:productId` | `catalogController.removeCollectionProduct()` | catalog.routes.ts:L76 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Remove product from collection |
| 27 | **PUT** | `/admin/collections/:id/products/reorder` | `catalogController.reorderCollectionProducts()` | catalog.routes.ts:L77 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Reorder products in collection |

**Validation Schemas:**
- Create: `CreateCollectionSchema`
- Update: `UpdateCollectionSchema`
- Add Products: `AddCollectionProductsSchema`
- Reorder: `ReorderCollectionProductsSchema`

**Associated Controller Methods:** catalog.controller.ts:L211-232

---

### 1.6 Variant Template CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 28 | **GET** | `/admin/catalog/templates` | `catalogController.listVariantTemplates()` | catalog.routes.ts:L79 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | List variant templates |
| 29 | **POST** | `/admin/catalog/templates` | `catalogController.createVariantTemplate()` | catalog.routes.ts:L80 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Create variant template |
| 30 | **PATCH** | `/admin/catalog/templates/:id` | `catalogController.updateVariantTemplate()` | catalog.routes.ts:L81 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Update variant template |
| 31 | **DELETE** | `/admin/catalog/templates/:id` | `catalogController.deleteVariantTemplate()` | catalog.routes.ts:L82 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Delete variant template |

**Validation Schemas:**
- Create: `CreateVariantTemplateSchema`
- Update: Custom object with `sizes` and `colours`

**Associated Controller Methods:** catalog.controller.ts:L233-253

---

### 1.7 Pricing CRUD Operations (Bulk)

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 32 | **POST** | `/admin/pricing/bulk-update` | `catalogController.bulkPriceUpdate()` | catalog.routes.ts:L64 | `requireAuth`, `requireRole('superAdmin')` | **BULK** - Update prices for multiple products |
| 33 | **POST** | `/admin/pricing/schedule` | `catalogController.schedulePriceChange()` | catalog.routes.ts:L65 | `requireAuth`, `requireRole('superAdmin')` | Schedule price change for future date |
| 34 | **GET** | `/admin/pricing/schedule` | `catalogController.listScheduledPriceChanges()` | catalog.routes.ts:L66 | `requireAuth`, `requireRole('superAdmin')` | List scheduled price changes |

**Validation Schemas:**
- Bulk Update: `BulkPriceUpdateSchema`
- Schedule: `SchedulePriceChangeSchema`
- List Query: `PriceChangeListQuerySchema`

**Associated Controller Methods:** catalog.controller.ts:L156-164

---

### 1.8 Bulk Upload Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 35 | **POST** | `/admin/products/bulk-upload` | `catalogController.bulkUpload()` | catalog.routes.ts:L63 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | **BULK** - Upload products via CSV |
| 36 | **GET** | `/admin/products/bulk-upload/template` | `catalogController.getBulkTemplate()` | catalog.routes.ts:L64 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Download CSV template for bulk upload |

**Associated Controller Methods:** catalog.controller.ts:L148-154

---

### 1.9 Utility Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 37 | **POST** | `/admin/catalog/cleanup-meter-sizes` | `catalogController.cleanupMeterSizes()` | catalog.routes.ts:L83 | `requireAuth`, `requireRole('superAdmin')` | Clean up meter size variants |

**Associated Controller Methods:** catalog.controller.ts:L254-257

---

## 2. INVENTORY SERVICE CRUD ENDPOINTS
**Base Path:** `/admin/inventory`  
**Service Location:** `services/inventory-service/src`

### 2.1 Stock Level CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 38 | **GET** | `/` | `inventoryController.listInventory()` | inventory.routes.ts:L34 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager', 'supportAgent')` | List all inventory with stock levels |
| 39 | **PATCH** | `/:variantId` | `inventoryController.manualAdjustment()` | inventory.routes.ts:L37 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Manual stock adjustment (add/remove qty) |
| 40 | **PATCH** | `/:variantId/threshold` | `inventoryController.updateThreshold()` | inventory.routes.ts:L40 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Update restock threshold for variant |

**Validation Schemas:**
- Manual Adjustment: `ManualAdjustmentSchema`
- Update Threshold: `UpdateThresholdSchema`

**Associated Controller Methods:** inventory.controller.ts:L11-130

---

### 2.2 Bulk Stock Adjustment

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 41 | **POST** | `/adjustment/bulk` | `inventoryController.bulkAdjustment()` | inventory.routes.ts:L43 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | **BULK** - Upload CSV for batch stock adjustments (5MB max) |

**File Upload Requirement:**
- Accepts multipart/form-data with `file` field (CSV format)
- Supported MIME types: `text/csv`, `application/vnd.ms-excel`, `.csv` extension
- Max file size: 5MB

**Associated Controller Methods:** inventory.controller.ts:L34-58

---

### 2.3 Expected Arrivals CRUD Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 42 | **GET** | `/expected` | `inventoryController.getExpectedArrivals()` | inventory.routes.ts:L46 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | List expected stock arrivals |
| 43 | **POST** | `/expected` | `inventoryController.addExpectedArrival()` | inventory.routes.ts:L47 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Add expected arrival record |
| 44 | **PATCH** | `/expected/:id/receive` | `inventoryController.markArrivalReceived()` | inventory.routes.ts:L48 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Mark expected arrival as received |

**Validation Schemas:**
- Add Arrival: `ExpectedArrivalSchema`

**Associated Controller Methods:** inventory.controller.ts:L60-89

---

### 2.4 Analytics & Reporting Operations

| # | HTTP Method | Route | Endpoint Signature | Line | Authentication | Description |
|---|---|---|---|---|---|---|
| 45 | **GET** | `/health` | `inventoryController.getHealth()` | inventory.routes.ts:L51 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager', 'supportAgent')` | Get stock health dashboard data |
| 46 | **GET** | `/velocity` | `inventoryController.getVelocity()` | inventory.routes.ts:L54 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Get inventory velocity analysis |
| 47 | **GET** | `/suggestions` | `inventoryController.getRestockSuggestions()` | inventory.routes.ts:L57 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Get AI restock suggestions |
| 48 | **GET** | `/dead-stock` | `inventoryController.getDeadStock()` | inventory.routes.ts:L60 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Identify dead stock (default 30 days) |
| 49 | **GET** | `/demand-patterns` | `inventoryController.getDemandPatterns()` | inventory.routes.ts:L66 | `requireAuth`, `requireRole('superAdmin', 'inventoryManager')` | Analyze demand patterns (default 30 days) |

**Query Parameters:**
- `days` (GET requests): Number of days to analyze (default: 30, must be positive)

**Associated Controller Methods:** inventory.controller.ts:L103-156

---

## 3. Authentication & Authorization Summary

### Role-Based Access Control (RBAC)

**Roles Used:**
- `superAdmin` - Full system access
- `inventoryManager` - Manage inventory, catalog, pricing
- `supportAgent` - Read-only access (limited views)

### Middleware Used

| Middleware | Location | Purpose |
|---|---|---|
| `requireAuth` | `@fs/shared` | Validates JWT token and attaches user to request |
| `requireRole()` | `@fs/shared` | Role-based authorization (variadic - accepts multiple roles) |
| `validateBody()` | `inventory-service/src/middleware/validate` | Zod schema validation for request body |
| `upload.single('file')` | `multer` | File upload handling (inventory bulk adjustment) |

### Authorization Patterns

**Public Access (No Auth):**
- Product listings, brand/category/collection reads

**Authenticated + Role-Based (superAdmin or inventoryManager):**
- Product CRUD operations
- Variant management
- Brand/Category/Collection management
- Pricing operations
- Inventory adjustments
- Expected arrivals

**Authenticated + Role-Based (superAdmin only):**
- Bulk price updates
- Schedule price changes
- Meter size cleanup
- Access to velocity/suggestions analytics

---

## 4. Bulk Operations Summary

| Operation | Endpoint | Method | Route | Type | Purpose |
|---|---|---|---|---|---|
| **Bulk Product Upload** | `bulkUpload()` | POST | `/admin/products/bulk-upload` | CSV | Queue bulk product creation/update from CSV |
| **Bulk Variant Update** | `bulkUpdateVariants()` | PATCH | `/admin/products/:id/variants/bulk` | JSON Array | Update multiple variants for a product |
| **Bulk Price Update** | `bulkPriceUpdate()` | POST | `/admin/pricing/bulk-update` | JSON | Update prices for multiple products/variants |
| **Bulk Stock Adjustment** | `bulkAdjustment()` | POST | `/adjustment/bulk` | CSV (Multipart) | Adjust inventory across multiple variants via CSV file |

---

## 5. File Path Reference

### Catalog Service
- **Routes:** [services/catalog-service/src/routes/catalog.routes.ts](services/catalog-service/src/routes/catalog.routes.ts)
- **Controller:** [services/catalog-service/src/controllers/catalog.controller.ts](services/catalog-service/src/controllers/catalog.controller.ts)
- **Schemas:** `services/catalog-service/src/schemas/catalog.schemas`
- **Services:** `services/catalog-service/src/services/`
- **Entry Point:** [services/catalog-service/src/index.ts](services/catalog-service/src/index.ts#L9)

### Inventory Service
- **Routes:** [services/inventory-service/src/routes/inventory.routes.ts](services/inventory-service/src/routes/inventory.routes.ts)
- **Controller:** [services/inventory-service/src/controllers/inventory.controller.ts](services/inventory-service/src/controllers/inventory.controller.ts)
- **Schemas:** `services/inventory-service/src/schemas/inventory.schemas`
- **Services:** `services/inventory-service/src/services/`
- **Middleware:** `services/inventory-service/src/middleware/`
- **Entry Point:** [services/inventory-service/src/index.ts](services/inventory-service/src/index.ts#L7)

---

## 6. Endpoint Statistics

| Metric | Count |
|---|---|
| **Total CRUD Endpoints** | **49** |
| **Catalog Service Endpoints** | 37 |
| **Inventory Service Endpoints** | 12 |
| **Public (Unauthenticated) Endpoints** | 7 |
| **Admin (Authenticated) Endpoints** | 42 |
| **Bulk Operation Endpoints** | 4 |
| **HTTP GET Operations** | 19 |
| **HTTP POST Operations** | 15 |
| **HTTP PATCH Operations** | 10 |
| **HTTP PUT Operations** | 1 |
| **HTTP DELETE Operations** | 5 |

---

## 7. Request/Response Validation

### Catalog Service Schemas
All endpoints use Zod schema validation. Key schemas:
- `ProductQuerySchema`, `CreateProductSchema`, `UpdateProductSchema`
- `BrandSchema`, `CategorySchema`, `CollectionSchema`
- `VariantSchema`, `CreateVariantSchema`, `UpdateVariantSchema`
- `BulkUploadRequestSchema`, `BulkPriceUpdateSchema`, `SchedulePriceChangeSchema`
- `VariantTemplateSchema`, `CreateVariantTemplateSchema`
- `IdParamSchema`, `VariantIdParamSchema`

### Inventory Service Schemas
- `ManualAdjustmentSchema` - { `newQty`: number, `reason`: string }
- `UpdateThresholdSchema` - { `threshold_qty`: number }
- `ExpectedArrivalSchema` - { `variant_id`, `expected_qty`, `expected_date`, `notes` }
- `IdParamSchema`, `VariantIdParamSchema`

---

## 8. Error Handling

All endpoints use centralized error handling via:
- **`catchAsync`** wrapper (Express error boundary)
- **`AppError`** with `ErrorCode` enums (standardized errors)
- **Global error handler** middleware in shared package
- **401 Unauthorized** for missing auth
- **403 Forbidden** for insufficient roles
- **400 Validation Error** for schema validation failures
- **404/500** for resource not found or server errors

