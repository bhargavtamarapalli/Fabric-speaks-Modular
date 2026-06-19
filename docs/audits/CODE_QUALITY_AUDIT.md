# Code Quality Audit Report
## Database Performance & Reliability Issues

**Assessment Date:** April 1, 2026  
**Scope:** Catalog Service, Inventory Service, Order Service, Cart Service, Payment Service  
**Focus Areas:** N+1 Queries, Error Handling, Transaction Boundaries, Concurrency Control

---

## 1. N+1 QUERY PATTERNS ⚠️ CRITICAL

### 1.1 Catalog Service - Promise.all with Per-Product Variant Lookups

**File:** [services/catalog-service/src/services/catalog.service.ts](services/catalog-service/src/services/catalog.service.ts)

**Issue Location 1 - listProducts method:**
- **Lines:** [50-68](services/catalog-service/src/services/catalog.service.ts#L50-L68)
- **Severity:** HIGH

```typescript
// PROBLEM: N+1 query - one query per product for variants
const enhancedItems: EnhancedProduct[] = await Promise.all(products.map(async (p: Product) => {
    const variants = await this.variantRepo.findByProductId(p.id);  // QUERY PER PRODUCT
    const flatProduct = this.flattenFabricFields(p);
    return {
        ...flatProduct,
        variants: variants.map((v: Variant) => ({
            ...v,
            effectivePrice: getEffectivePrice({
                base_price: v.basePrice,
                sale_price: v.salePrice,
                price_override: v.priceOverride,
                sale_active: v.saleActive
            })
        }))
    } as EnhancedProduct;
}));
```

**Impact:**
- If listing 100 products, makes 101 queries (1 for products + 100 for variants)
- Promise.all runs them in parallel but still N+1 problem with database connections
- Can exhaust connection pool

**Issue Location 2 - adminListProducts method:**
- **Lines:** [77-95](services/catalog-service/src/services/catalog.service.ts#L77-L95)
- **Severity:** HIGH
- Same N+1 pattern as listProducts

**Root Cause:** Repository doesn't provide bulk variant fetch method

**Recommended Fix:**
```typescript
// SOLUTION: Batch load variants
async listProducts(filters: ProductQueryDto): Promise<{ items: EnhancedProduct[]; total: number }> {
    const { items: products, total } = await this.productRepo.findAll(filters);
    
    // Batch load variants for ALL products
    const productIds = products.map(p => p.id);
    const allVariants = await this.variantRepo.findByProductIds(productIds); // Batch method
    const variantsByProductId = new Map(
        allVariants.map(v => [v.productId, v])
    );
    
    const enhancedItems = products.map(p => ({
        ...this.flattenFabricFields(p),
        variants: variantsByProductId.get(p.id) || []
    }));
    
    return { items: enhancedItems, total };
}
```

---

### 1.2 Catalog Service - duplicateProduct N+1

**File:** [services/catalog-service/src/services/catalog.service.ts](services/catalog-service/src/services/catalog.service.ts)

**Issue Location - duplicateProduct method:**
- **Lines:** [207-212](services/catalog-service/src/services/catalog.service.ts#L207-L212)

```typescript
async duplicateProduct(id: string, adminId: string): Promise<Product> {
    const original = await this.productRepo.findById(id);
    const variants = await this.variantRepo.findByProductId(id);  // Query per product
    // ... creates copy with variants
}
```

**Impact:** Additional query when duplicating products

**Severity:** MEDIUM

---

## 2. ERROR HANDLING GAPS 🔴 CRITICAL

### 2.1 Inventory Service - CSV Parse Error Swallowing

**File:** [services/inventory-service/src/services/inventory.service.ts](services/inventory-service/src/services/inventory.service.ts)

**Issue Location - bulkAdjustment method:**
- **Lines:** [88-91](services/inventory-service/src/services/inventory.service.ts#L88-L91)
- **Severity:** HIGH

```typescript
.on('error', (err) => {
    reject(new AppError(ErrorCode.VALIDATION_ERROR, 'Failed to parse CSV'));
    // PROBLEM: Original error details are completely lost
    // No logging of what actually went wrong
    // Generic error code masks real issues (file I/O? stream corruption?)
});
```

**Issues:**
1. ❌ Original error is swallowed
2. ❌ No specific error code (uses generic VALIDATION_ERROR)
3. ❌ No logging with context
4. ❌ Makes debugging difficult

**Fix:**
```typescript
.on('error', (err) => {
    logger.error({
        error: err.message,
        code: err.code,
        stack: err.stack,
        context: 'CSV_PARSE_ERROR'
    }, 'Failed to parse CSV during bulk adjustment');
    reject(new AppError(
        ErrorCode.CSV_PARSING_ERROR, 
        'Failed to parse CSV file',
        { originalError: err.message, context: 'CSV_PARSE' }
    ));
});
```

---

### 2.2 Inventory Service - Silent Failures in Catch Blocks

**File:** [services/inventory-service/src/services/inventory.service.ts](services/inventory-service/src/services/inventory.service.ts)

**Issue Location - bulkAdjustment method:**
- **Lines:** [77-84](services/inventory-service/src/services/inventory.service.ts#L77-L84)
- **Severity:** MEDIUM

```typescript
for (const row of results) {
    try {
        // Validation and adjustment logic
    } catch (err) {
        failedCount++;
        errors.push({ row, error: (err as Error).message });
        // PROBLEM: Returns incomplete error info, no error code tracking
        // Silent catch - returns processed but doesn't indicate severity
    }
}
```

**Issues:**
1. ❌ Error code information lost
2. ❌ No distinction between validation errors vs DB errors vs other failures
3. ❌ Makes it hard to debug bulk operations

---

### 2.3 Catalog Service - Potential Audit Log Failures Not Handled

**File:** [services/catalog-service/src/services/catalog.service.ts](services/catalog-service/src/services/catalog.service.ts)

**Issue Locations:**
- **Line 132:** [services/catalog-service/src/services/catalog.service.ts#L132-L138](services/catalog-service/src/services/catalog.service.ts#L132-L138) - createProduct
- **Line 153:** [services/catalog-service/src/services/catalog.service.ts#L153-L159](services/catalog-service/src/services/catalog.service.ts#L153-L159) - updateProduct
- **Severity:** MEDIUM

```typescript
const product = await this.productRepo.withTransaction(async (client: any) => {
    const createdProduct = await this.productRepo.create(productPayload, client);
    // Product created in transaction
    return createdProduct;
});

await this.auditLogRepo.insert({
    // PROBLEM: If audit log insert fails, no error handling
    // Main operation succeeded but audit is lost
    adminId,
    action: 'product.create',
    afterJson: { ...product }
});
```

**Issues:**
1. ❌ Audit log failure won't rollback main transaction
2. ❌ No retry logic
3. ❌ Compliance issue - audit trail may be incomplete

---

### 2.4 Order Service - Transaction Rollback but No Error Code Propagation

**File:** [services/order-service/src/services/order.service.ts](services/order-service/src/services/order.service.ts)

**Issue Location - placeOrder method:**
- **Lines:** [152-156](services/order-service/src/services/order.service.ts#L152-L156)
- **Severity:** LOW

```typescript
} catch (error) {
    await client.query('ROLLBACK');
    throw error;  // PROBLEM: Generic error pass-through
    // If error is from a deep call, may not have proper error codes
}
```

**Issues:**
1. ⚠️ Raw errors passed through without ErrorCode wrapping
2. ⚠️ Makes API error handling inconsistent

---

## 3. TRANSACTION BOUNDARIES ✅ GOOD PATTERNS FOUND

### 3.1 Order Service - Proper Transaction Usage

**File:** [services/order-service/src/services/order.service.ts](services/order-service/src/services/order.service.ts)

**Good Pattern - placeOrder method:**
- **Lines:** [27-156](services/order-service/src/services/order.service.ts#L27-L156)
- **Status:** ✅ CORRECT

```typescript
async placeOrder(userId: string | null, orderPayload: any) {
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // All operations within transaction
        const variant = await this.orderRepo.getVariantForLock(client, item.variant_id);
        const locked = await this.orderRepo.lockStockWithOCC(client, item.variant_id, variant.version, item.quantity);
        const newOrder = await this.orderRepo.createOrder(client, {...});
        
        for (const vItem of verifiedItems) {
            await this.orderRepo.createOrderItem(client, {...});
        }
        
        await client.query('COMMIT');  // ✅ Explicit COMMIT
        return newOrder;
    } catch (error) {
        await client.query('ROLLBACK');  // ✅ Explicit ROLLBACK
        throw error;
    } finally {
        client.release();  // ✅ Resource cleanup
    }
}
```

**Strengths:**
1. ✅ Explicit BEGIN/COMMIT with proper cleanup
2. ✅ ROLLBACK on any error
3. ✅ Finally block ensures connection release

---

### 3.2 Catalog Service - Transaction Pattern via withTransaction

**File:** [services/catalog-service/src/services/catalog.service.ts](services/catalog-service/src/services/catalog.service.ts)

**Good Pattern - createProduct method:**
- **Lines:** [126-131](services/catalog-service/src/services/catalog.service.ts#L126-L131)
- **Status:** ✅ CORRECT

```typescript
const product = await this.productRepo.withTransaction(async (client: any) => {
    const createdProduct = await this.productRepo.create(productPayload, client);
    await this.variantRepo.bulkCreate(createdProduct.id, variants, client);
    return createdProduct;
});
```

**Strengths:**
1. ✅ Uses repository abstraction for transactions
2. ✅ Keeps product and variants creation atomic

---

### 3.3 Inventory Service - Pessimistic Locking in Transaction

**File:** [services/inventory-service/src/repositories/inventory.repository.ts](services/inventory-service/src/repositories/inventory.repository.ts)

**Pattern - adjustStock method:**
- **Lines:** [103-127](services/inventory-service/src/repositories/inventory.repository.ts#L103-L127)
- **Status:** ✅ CORRECT

```typescript
return this.withTransaction(async (client) => {
    // 1. Lock variant row for update
    const oldRes = await client.query('SELECT qty FROM variants WHERE id = $1 FOR UPDATE', [variantId]);
    
    // 2. Update variant qty
    await client.query(`
        UPDATE variants 
        SET qty = $2, updated_at = now() 
        WHERE id = $1 
        RETURNING *
    `, [variantId, newQty]);
    
    // 3. Insert into stock_adjustments
    await client.query(`
        INSERT INTO stock_adjustments (...)
        VALUES ($1, $2, $3, $4, $5)
    `, [variantId, oldQty, newQty, reason, adminUserId]);
});
```

**Strengths:**
1. ✅ Uses FOR UPDATE for pessimistic locking
2. ✅ Audit log (stock_adjustments) created within transaction
3. ✅ Ensures atomicity of stock change + audit trail

---

## 4. CONCURRENCY CONTROL 🔒 MIXED PATTERNS

### 4.1 Order Service - Optimistic Concurrency Control (OCC)

**File:** [services/order-service/src/repositories/order.repository.ts](services/order-service/src/repositories/order.repository.ts)

**Pattern - lockStockWithOCC method:**
- **Lines:** [93-104](services/order-service/src/repositories/order.repository.ts#L93-L104)
- **Type:** ✅ Optimistic Concurrency Control
- **Status:** ✅ CORRECT for read-heavy workloads

```typescript
async lockStockWithOCC(client: PoolClient, variantId: string, version: number, decrementQty: number) {
    // Optimistic Concurrency Control
    const res = await client.query(`
        UPDATE variants 
        SET qty = qty - $1, version = version + 1
        WHERE id = $2 AND version = $3 AND qty >= $1
        RETURNING id, qty, version
    `, [decrementQty, variantId, version]);
    
    return res.rows.length > 0;  // Returns false if version mismatch (CAS operation)
}
```

**How It Works:**
- `version` column acts as optimistic lock token
- UPDATE only succeeds if version matches (Compare-And-Swap)
- Returns empty if version changed (concurrent update detected)

**Strengths:**
1. ✅ No database locks during read/wait phase
2. ✅ Good for high-concurrency scenarios
3. ✅ Prevents race conditions via version check

**Weaknesses:**
1. ⚠️ Retry logic not visible in placeOrder - where is retry handled?
2. ⚠️ If OCC fails, user gets generic error instead of retry suggestion

**Usage in placeOrder:**
- **Lines:** [69-75](services/order-service/src/services/order.service.ts#L69-L75)

```typescript
const locked = await this.orderRepo.lockStockWithOCC(client, item.variant_id, variant.version, item.quantity);
if (!locked) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, `Concurrent stock update failed for ${variant.name}. Please try again.`);
}
```

**Issue:** If OCC fails, the entire order fails. No retry - user must retry manually.

---

### 4.2 Inventory Service - Pessimistic Locking

**File:** [services/inventory-service/src/repositories/inventory.repository.ts](services/inventory-service/src/repositories/inventory.repository.ts)

**Pattern - adjustStock within transaction:**
- **Line:** [110](services/inventory-service/src/repositories/inventory.repository.ts#L110)
- **Type:** 🔒 Pessimistic Lock (FOR UPDATE)
- **Status:** ✅ CORRECT

```typescript
const oldRes = await client.query('SELECT qty FROM variants WHERE id = $1 FOR UPDATE', [variantId]);
```

**Strengths:**
1. ✅ Guarantees exclusive access
2. ✅ No race conditions possible
3. ✅ Works well for critical inventory operations

**Weaknesses:**
1. ⚠️ Can cause lock contention under high concurrency
2. ⚠️ Risk of deadlocks if multiple variants updated in different order

---

### 4.3 Cart Service - Race Condition Vulnerability

**File:** [services/cart-service/src/services/cart.service.ts](services/cart-service/src/services/cart.service.ts)

**Vulnerable Pattern - addItem method:**
- **Lines:** [109-125](services/cart-service/src/services/cart.service.ts#L109-L125)
- **Severity:** 🔴 CRITICAL RACE CONDITION

```typescript
async addItem(userId: string | undefined, sessionId: string | undefined, dto: AddCartItemDto): Promise<void> {
    // Step 1: Check stock
    const variantDetails = await this.catalogInt.getVariantStockDetails(dto.variantId);
    
    // RACE CONDITION WINDOW: Between stock check and adding to cart
    // Another process could have reserved this stock
    
    if (userId) {
        // Step 2: Add to cart (no atomicity guarantee)
        await this.cartRepo.addUserItem(userId, dto.variantId, dto.quantity, variantDetails.price);
        // PROBLEM: No lock held between stock check and add
    }
}
```

**Race Condition Scenario:**
```
Time    User A                          User B
---     ------                          ------
T1      Check stock = 5 items          -
T2      -                               Check stock = 5 items
T3      Add 3 items to cart OK          -
T4      -                               Add 4 items to cart OK
T5      Both believe they have items, but only 5 available
```

**Issue:** TOCTOU (Time-of-Check-Time-of-Use) vulnerability

**Fix Options:**
1. Use SELECT FOR UPDATE with variant row lock
2. Move stock check into transaction with cart update
3. Use application-level distributed lock (Redis)

---

### 4.4 Order Service - Missing Concurrency on Multiple Variants

**File:** [services/order-service/src/services/order.service.ts](services/order-service/src/services/order.service.ts)

**Vulnerable Pattern - placeOrder with multiple items:**
- **Lines:** [63-81](services/order-service/src/services/order.service.ts#L63-L81)
- **Severity:** 🟡 MEDIUM

```typescript
for (const item of orderPayload.cart_items) {
    const variant = await this.orderRepo.getVariantForLock(client, item.variant_id);
    
    // Lock each variant individually with OCC
    const locked = await this.orderRepo.lockStockWithOCC(client, item.variant_id, variant.version, item.quantity);
    if (!locked) {
        throw new AppError(ErrorCode.INTERNAL_ERROR, `Concurrent stock update failed`);
        // PROBLEM: Partial update - if 3rd item fails, first 2 already locked
        // Transaction ROLLS BACK, but user had to wait
    }
}
```

**Issue:** 
- Each item locked one-at-a-time within loop
- If item 3 of 5 fails OCC, items 1-2 were updated before rollback
- Under high concurrency, can cause thrashing

**Better Approach:**
```typescript
// Lock all variants first, then verify all stock available
const locks = await Promise.all(cart_items.map(item =>
    this.orderRepo.lockStockWithOCC(client, item.variant_id, item.version, item.quantity)
));
if (!locks.every(l => l)) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Stock unavailable, please review cart and retry');
}
```

---

## 5. SUMMARY TABLE

| Issue | File | Lines | Severity | Type | Status |
|-------|------|-------|----------|------|--------|
| N+1 Variants in listProducts | catalog-service.ts | 50-68 | 🔴 HIGH | Query | ❌ Not Fixed |
| N+1 Variants in adminListProducts | catalog-service.ts | 77-95 | 🔴 HIGH | Query | ❌ Not Fixed |
| CSV error swallowing | inventory.service.ts | 88-91 | 🔴 HIGH | Error | ❌ Not Fixed |
| Silent catch blocks | inventory.service.ts | 77-84 | 🟡 MEDIUM | Error | ❌ Not Fixed |
| Audit log no error handling | catalog-service.ts | 132-138 | 🟡 MEDIUM | Error | ❌ Not Fixed |
| OCC retry logic missing | order.service.ts | 69-75 | 🟡 MEDIUM | Retry | ⚠️ Partial |
| Cart TOCTOU race condition | cart.service.ts | 109-125 | 🔴 CRITICAL | Locking | ❌ Not Fixed |
| Multiple variant lock thrashing | order.service.ts | 63-81 | 🟡 MEDIUM | Locking | ⚠️ Partial |
| Proper transaction (Order) | order.service.ts | 27-156 | ✅ | Transaction | ✅ Good |
| FOR UPDATE lock (Inventory) | inventory.repository.ts | 110 | ✅ | Locking | ✅ Good |

---

## 6. RECOMMENDED FIXES (PRIORITY ORDER)

### Priority 1 (This Week)
1. **Fix Cart TOCTOU Race Condition** - Deploy pessimistic lock on cart add
2. **Fix CSV Error Handling** - Add proper logging and error codes
3. **Fix N+1 Queries** - Add batch variant loading method

### Priority 2 (Next Week)
4. **Fix Audit Log Error Handling** - Add retry policy or circuit breaker
5. **Improve OCC Retry Logic** - Add exponential backoff for retry scenarios
6. **Fix Multiple Variant Locking** - Batch lock all variants before processing

### Priority 3 (Sprint Planning)
7. **Add Distributed Lock Coordination** - For cross-service inventory operations
8. **Add Query Performance Monitoring** - Detect N+1 patterns in production

---

## 7. CONNECTIONS & DEPENDENCIES

- **Payment Service** → Order Service (creates orders, triggers payments)
- **Order Service** → Inventory Service (decrements stock via OCC)
- **Cart Service** → Catalog Service (checks stock availability)
- **Catalog Service** → (standalone for product management)

**Risk Chain:** If Cart Service race condition exploited → orders with unavailable stock → payment failures → customer complaints

