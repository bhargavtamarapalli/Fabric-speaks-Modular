# Backend Services Remediation & Compliance Plan

**Project:** Fabric Speaks (India-first ecommerce, Node.js microservices)  
**Audit Date:** March 14, 2026  
**Review Type:** Exhaustive code inspection against 6 RULES + service requirements  
**Status:** DRAFT — Ready for approval

---

## Executive Summary

| Category | Finding |
|----------|---------|
| **Services Audit** | ✅ 3 ready (95%+), ⚠️ 6 partial (70-80%), ❌ 3 broken (40-70%) |
| **Critical Issues** | 🔴 ~35 blocking issues across services |
| **Security Vulnerabilities** | 🔴 2 timing attacks (Payment), 1 webhook no-auth (Order), rate limits missing (Auth) |
| **RULE Violations** | 🔴 RULE 1, 2, 6 failures across multiple services |
| **Ready for Frontend** | ❌ **NO** — Critical blockers must be fixed |
| **Estimated Fix Time** | ⏱️ **12-15 days** for full compliance |

---

## Service Status Summary

### Ready (95%+)
- **Notification Service** — Full event-driven worker, all 10 events handled, WhatsApp templates, SMS fallback, loyalty scheduler ✅
- **Support Service** — Queue management, case details, agent notes, mobile lookup ✅
- **Search Service** — Full-text search with GIN index, suggestions caching, parameterized queries ✅

### Partial (70-80%)
- **Admin Service** — 80% (Dashboard returns mock data; role validation too permissive)
- **Inventory Service** — 75% (Missing audit logs, old_qty capture, CSV pre-validation)
- **Pincode Service** — 75% (Missing 6-digit validation, audit logs)

### Broken (40-70%)
- **Auth Service** — 70% (JWT expiry wrong, rate limits missing, mobile not masked)
- **Payment Service** — 70% (2 timing attack vulnerabilities, env validation weak)
- **Catalog Service** — 70% (Fabric field storage completely broken)
- **Cart Service** — 70% (Price not locked at add time — RULE 1 violation)
- **Order Service** — 40% (Status machine broken, guest fields missing, Shiprocket & webhook stubs, no audit logs)
- **Return Service** — 40% (7-day enforcement missing, refund/replacement not implemented, user_id from param violates RULE 2)

---

## Phase 1: Critical Security & Blocking Issues (5 days)

### P1.1 — Auth Service (1 day)

**Issue 1: JWT Expiry Wrong**
- **Current:** 7 days (line 71 in auth.service.ts)
- **Requirement:** 30 days
- **Fix:** Change `expiresIn: '7d'` → `expiresIn: '30d'`
- **File:** [services/auth-service/src/services/auth.service.ts](services/auth-service/src/services/auth.service.ts#L71)

**Issue 2: Rate Limiting Completely Missing**
- **Current:** None
- **Requirement:** Per-mobile (3 requests/10 min), per-IP (5 requests/10 min)
- **Fix:** Add middleware in auth.routes.ts that:
  - Checks Redis `otp_rate:{mobile}` counter (incr, set 600s TTL)
  - Checks Redis `otp_rate_ip:{ip}` counter (incr, set 600s TTL)
  - Returns 429 with `retry-after` header if limit exceeded
- **File:** [services/auth-service/src/routes/auth.routes.ts](services/auth-service/src/routes/auth.routes.ts)

**Issue 3: JWT Missing Masked Mobile Claim**
- **Current:** JWT only has `{userId, role, iat, exp}`
- **Requirement:** Include `mobile: maskMobile(user.mobile)` (last 4 digits only)
- **Fix:** Add masked mobile to payload at line 66-67
- **File:** [services/auth-service/src/services/auth.service.ts](services/auth-service/src/services/auth.service.ts#L66)

**Issue 4: JWT Algorithm Not Explicit**
- **Current:** Defaults to HS256, not stated
- **Requirement:** Explicit `algorithm: 'HS256'`
- **Fix:** Add `algorithm: 'HS256'` to jwt.sign options at line 71
- **File:** [services/auth-service/src/services/auth.service.ts](services/auth-service/src/services/auth.service.ts#L71)

**Issue 5: DPDPA Deletion Not Audited (RULE 6 Violation)**
- **Current:** No audit log entry
- **Requirement:** Log account deletion to audit_log
- **Fix:** Add `await auditLogRepo.insert({action: 'account_deleted', userId, ...})` after line 62
- **File:** [services/auth-service/src/controllers/auth.controller.ts](services/auth-service/src/controllers/auth.controller.ts#L30)

**Issue 6: Mobile Field Uses Fake String Instead of Hash**
- **Current:** Sets mobile to `"deleted_${id.slice(0,5)}"` (readable)
- **Requirement:** Hash mobile using crypto.SHA256
- **Fix:** Change line 57 to use crypto.createHash('sha256').update(id).digest('hex')
- **File:** [services/auth-service/src/repositories/user.repository.ts](services/auth-service/src/repositories/user.repository.ts#L57)

---

### P1.2 — Payment Service (1 day)

**🔴 CRITICAL SECURITY: Timing Attack Vulnerability #1**
- **Current:** `if (expectedSignature !== razorpaySignature)` at line 91
- **Vulnerability:** Allows timing attack to forge signatures by measuring response time
- **Fix:** Replace with:
  ```typescript
  const validSignature = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );
  if (!validSignature) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid payment signature');
  ```
- **File:** [services/payment-service/src/services/payment.service.ts](services/payment-service/src/services/payment.service.ts#L91)

**🔴 CRITICAL SECURITY: Timing Attack Vulnerability #2**
- **Current:** `if (expectedSignature !== signature)` at line 107 in webhook handler
- **Vulnerability:** Same timing attack risk in webhook verification
- **Fix:** Same as above — use `crypto.timingSafeEqual()`
- **File:** [services/payment-service/src/services/payment.service.ts](services/payment-service/src/services/payment.service.ts#L107)

**Issue 3: Razorpay Environment Validation Too Lenient**
- **Current:** `.optional()` on RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
- **Requirement:** These are required, should fail at startup if missing
- **Fix:** Change from `.optional()` to `.min(1)` for all three
- **File:** [services/payment-service/src/config/env.ts](services/payment-service/src/config/env.ts)

---

### P1.3 — Catalog Service (1 day)

**CRITICAL: Fabric Field Storage Completely Broken**
- **Current:** Repository tries to INSERT into non-existent columns (fabric_type, gsm_weight, weave_type, etc.)
- **Symptom:** CREATE /products will fail with "column does not exist" error
- **Root Cause:** DB schema uses JSONB `attributes` column, but code tries to insert as direct columns
- **Fix:** Map fabric fields to JSONB in product.repository.ts:
  ```typescript
  const fabricData = {
    fabric_type: dto.fabricType,
    gsm_weight: dto.gsmWeight,
    weave_type: dto.weaveType,
    breathability_rating: dto.breathabilityRating,
    care_instructions: dto.careInstructions,
    fabric_origin: dto.fabricOrigin
  };
  // INSERT with attributes = $fabricData as JSONB
  ```
- **Files:**
  - [services/catalog-service/src/repositories/product.repository.ts](services/catalog-service/src/repositories/product.repository.ts#L12-L15) — Mapping logic
  - [services/catalog-service/src/services/catalog.service.ts](services/catalog-service/src/services/catalog.service.ts#L67-L88) — PDP response (add fabric fields)
  - [services/catalog-service/src/schemas/catalog.schemas.ts](services/catalog-service/src/schemas/catalog.schemas.ts#L6) — Bulk upload schema (add all 6 fabric fields as REQUIRED)

---

### P1.4 — Cart Service (1 day)

**RULE 1 VIOLATION: Price Not Locked at Add Time**
- **Current:** Prices re-fetched from variants table on every GET /cart
- **Requirement:** Store `price_at_add` at item insertion, never re-fetch
- **Risk:** If product goes on sale, cart total changes retroactively (business logic bug)
- **Fix:**
  1. **DB Migration:** Add column `price_at_add NUMERIC(10,2)` to cart_items table
  2. **Repository:** On INSERT, capture variant.unit_price and store as price_at_add
  3. **GET Logic:** Use `ci.price_at_add` from cart_items, not variant.unit_price
- **Files:**
  - [db/migrations/](db/migrations/) — Create migration file with ADD COLUMN statement
  - [services/cart-service/src/repositories/cart.repository.ts](services/cart-service/src/repositories/cart.repository.ts#L66-L77) — Update INSERT to capture price

---

### P1.5 — Order Service (1.5 days)

**CRITICAL: Status Machine Enum Mismatch**
- **Current DB Values:** PLACED, PAYMENT_PENDING, PAYMENT_FAILED, CONFIRMED, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED
- **Required Values:** PENDING_PAYMENT, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED, RETURN_REQUESTED, RETURN_PICKED, RETURN_RECEIVED
- **Mismatch:** PACKED ≠ PROCESSING, RETURNED ≠ REFUNDED, missing RETURN_PICKED & RETURN_RECEIVED
- **Fix:** DB migration to rename enum values
  - PACKED → PROCESSING
  - RETURNED → REFUNDED
  - ADD RETURN_PICKED
  - ADD RETURN_RECEIVED
- **File:** [db/migrations/20250101000003_orders.sql](db/migrations/20250101000003_orders.sql#L62-L73)

**CRITICAL: Guest Order Fields Missing**
- **Current:** No guest_mobile, guest_address, tracking_token columns
- **Requirement:** Store guest info for tracking without account
- **Fix:** DB migration to add:
  - `guest_mobile CHAR(10)` — last 10 digits of phone
  - `guest_address JSONB` — delivery address for guest orders
  - `tracking_token UUID` — publicly shareable token for /orders/track/:token endpoint
- **File:** [db/migrations/20250101000003_orders.sql](db/migrations/20250101000003_orders.sql)

**CRITICAL: Shiprocket Webhook Validation is STUB**
- **Current:** [order.controller.ts:57-60](services/order-service/src/controllers/order.controller.ts#L57-L60) returns 200 without validation
- **Risk:** ANY attacker can POST fake webhooks and corrupt order status
- **Fix:** Implement:
  1. HMAC-SHA256 signature verification (like Payment service, use timingSafeEqual)
  2. IP whitelist check (get IPs from .env)
  3. Update order status + emit events only after validation passes
  4. Log webhook to database (for audit trail)
- **File:** [services/order-service/src/controllers/order.controller.ts](services/order-service/src/controllers/order.controller.ts#L57-L60)

**CRITICAL: Shiprocket API Integration is STUB**
- **Current:** [order.controller.ts:45-52](services/order-service/src/controllers/order.controller.ts#L45-L52) returns hardcoded mock `{shiprocket_order_id: '12345'}`
- **Requirement:** Actually call Shiprocket /orders API, store AWB + shiprocket_order_id on order
- **Fix:** Implement ShiprocketService with real API call when status transitions to PROCESSING
- **File:** [services/order-service/src/controllers/order.controller.ts](services/order-service/src/controllers/order.controller.ts#L45-L52)

**CRITICAL: Status Update Missing Audit Log (RULE 6 Violation)**
- **Current:** [order.service.ts:134-140](services/order-service/src/services/order.service.ts#L134-L140) no audit log
- **Requirement:** All admin mutations logged
- **Fix:** Add `await auditLogRepo.insert()` after status update
- **File:** [services/order-service/src/services/order.service.ts](services/order-service/src/services/order.service.ts#L134-L140)

---

## Phase 2: Business Logic Completeness (4 days)

### P2.1 — Order Service Continued (2 days)

**Issue: BullMQ Event Emit Commented Out**
- **Current:** [order.service.ts:73-74](services/order-service/src/services/order.service.ts#L73-L74) `// await eventQueue.add('order.created', ...)`
- **Requirement:** Emit order.created to notification queue
- **Fix:** Uncomment lines 73-74, verify eventQueue is injected
- **File:** [services/order-service/src/services/order.service.ts](services/order-service/src/services/order.service.ts#L73)

**Issue: Invalid Transition Error Missing Context**
- **Current:** Throws error but doesn't include current_status or allowed_states
- **Requirement:** 400 response with `{current_status, allowed_states}` object
- **Fix:** Update error response at [order.service.ts:136](services/order-service/src/services/order.service.ts#L136) to include state machine info
- **File:** [services/order-service/src/services/order.service.ts](services/order-service/src/services/order.service.ts#L136)

---

### P2.2 — Return Service (2 days)

**CRITICAL: 7-Day Window Not Enforced**
- **Current:** [return.service.ts:9-14](services/return-service/src/services/return.service.ts#L9-L14) accepts any order any time
- **Requirement:** Return only allowed if:
  1. Order status = DELIVERED
  2. Now - order.delivered_at ≤ 7 days (configurable)
- **Fix:** Add validation checks:
  ```typescript
  if (order.status !== 'DELIVERED') throw new AppError(ErrorCode.RETURN_NOT_ELIGIBLE, 'Order not delivered');
  const daysSinceDelivery = (Date.now() - order.delivered_at) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) throw new AppError(ErrorCode.RETURN_WINDOW_EXPIRED, 'Return window expired');
  ```
- **File:** [services/return-service/src/services/return.service.ts](services/return-service/src/services/return.service.ts#L9-L14)

**CRITICAL: Refund/Replacement Not Executed**
- **Current:** [return.service.ts:47-59](services/return-service/src/services/return.service.ts#L47-L59) just logs intention
- **Requirement:** Actually call Payment service for refund or create replacement order
- **Fix:** Implement:
  ```typescript
  if (resolution === 'refund') {
    await paymentService.triggerRefund(orderId);
    emit('return.refund_initiated', {...});
  } else if (resolution === 'replacement') {
    await orderService.createReplacementOrder(returnId);
  }
  ```
- **File:** [services/return-service/src/services/return.service.ts](services/return-service/src/services/return.service.ts#L47-L59)

**CRITICAL: No Shiprocket Reverse Pickup**
- **Current:** [return.service.ts:40-46](services/return-service/src/services/return.service.ts#L40-L46) has unused constructor injection
- **Requirement:** Call Shiprocket reverse pickup API, store pickup_date
- **Fix:** Implement ShiprocketService call to create reverse pickup
- **File:** [services/return-service/src/services/return.service.ts](services/return-service/src/services/return.service.ts#L40-L46)

**CRITICAL: No Events Emitted (Integration Missing)**
- **Current:** No calls to notification queue
- **Requirement:** Emit `return.requested` on creation, `return.refund_initiated` on refund
- **Fix:** Add event publisher calls with BullMQ
- **File:** [services/return-service/src/services/return.service.ts](services/return-service/src/services/return.service.ts)

**RULE 2 VIOLATION: user_id from Parameter**
- **Current:** [return.service.ts:9](services/return-service/src/services/return.service.ts#L9) accepts userId as function parameter
- **Requirement:** Always from JWT, never from request
- **Fix:** Change signature to extract from `req.user.userId` in controller only
- **File:** [services/return-service/src/controllers/return.controller.ts](services/return-service/src/controllers/return.controller.ts)

**RULE 6 VIOLATION: No Audit Log**
- **Current:** No audit log on status changes
- **Requirement:** Log all admin mutations
- **Fix:** Add `await auditLogRepo.insert()` on every status update
- **File:** [services/return-service/src/services/return.service.ts](services/return-service/src/services/return.service.ts#L32-L37)

---

### P2.3 — Admin Service (0.5 days)

**CRITICAL: Dashboard Returns Mock Data**
- **Current:** [admin.controller.ts:54-66](services/admin-service/src/controllers/admin.controller.ts#L54-L66) returns hardcoded metrics
- **Requirement:** Real DB queries for:
  - orders_today: count where created_at >= TODAY
  - revenue_today: sum(total_amount) where created_at >= TODAY
  - low_stock_count: count(variants) where stock_qty < reorder_level
  - open_returns_count: count(returns) where status in (RETURN_REQUESTED, RETURN_PICKED)
  - pending_orders_count: count(orders) where status in (PENDING_PAYMENT, CONFIRMED)
- **Fix:** Replace mock with actual queries
- **File:** [services/admin-service/src/controllers/admin.controller.ts](services/admin-service/src/controllers/admin.controller.ts#L54-L66)

**Issue: Role Validation Too Permissive**
- **Current:** [admin.controller.ts:24](services/admin-service/src/controllers/admin.controller.ts#L24) accepts 'customer' as admin role
- **Requirement:** Only admin roles: ['superAdmin', 'supportAgent']
- **Fix:** Update Zod schema to restrict role enum
- **File:** [services/admin-service/src/schemas/admin.schemas.ts](services/admin-service/src/schemas/admin.schemas.ts)

---

### P2.4 — Inventory Service (0.5 days)

**RULE 6 VIOLATION: No Audit Log**
- **Current:** No audit_log entries on stock adjustments
- **Requirement:** Log all admin mutations
- **Fix:** Add `await auditLogRepo.insert()` after each adjustment
- **File:** [services/inventory-service/src/services/inventory.service.ts](services/inventory-service/src/services/inventory.service.ts#L27-L32)

**Issue: old_qty Not Captured**
- **Current:** Tries to UPDATE without SELECT first, so old_qty field in logs is NULL
- **Requirement:** Capture previous qty before updating
- **Fix:** SELECT current qty first, then UPDATE, then log
- **File:** [services/inventory-service/src/repositories/inventory.repository.ts](services/inventory-service/src/repositories/inventory.repository.ts#L70-L80)

**Issue: Bulk Upload No Pre-Validation**
- **Current:** Parses CSV row-by-row, errors on individual rows
- **Requirement:** Validate CSV structure before processing, check row limit
- **Fix:** Add upfront validation for CSV schema + max 5000 rows
- **File:** [services/inventory-service/src/services/inventory.service.ts](services/inventory-service/src/services/inventory.service.ts#L49-L68)

---

## Phase 3: Polish & Warnings (3 days)

### P3.1 — Search Service (0.5 days)

**Issue: Empty Query Not Rejected**
- **Current:** [search.service.ts:21](services/search-service/src/services/search.service.ts#L21) allows empty q
- **Requirement:** Return 400 if q is empty or < 2 characters
- **Fix:** Add Zod schema validation `q: z.string().min(2)`
- **File:** [services/search-service/src/schemas/search.schemas.ts](services/search-service/src/schemas/search.schemas.ts)

**Issue: Fire-and-Forget Logging**
- **Current:** [search.service.ts:28](services/search-service/src/services/search.service.ts#L28) swallows logging errors
- **Requirement:** Log errors properly (to Sentry, not silent catch)
- **Fix:** Replace `.catch()` with Sentry.captureException()
- **File:** [services/search-service/src/services/search.service.ts](services/search-service/src/services/search.service.ts#L28)

---

### P3.2 — Pincode Service (0.5 days)

**Issue: 6-Digit Validation Missing**
- **Current:** [pincode.service.ts:62](services/pincode-service/src/services/pincode.service.ts#L62) accepts any non-empty string
- **Requirement:** Validate exactly 6 digits
- **Fix:** Add `.match(/^\d{6}$/)` check, return 400 INVALID_PINCODE if fails
- **File:** [services/pincode-service/src/services/pincode.service.ts](services/pincode-service/src/services/pincode.service.ts#L62)

**Issue: Empty Pincode Check**
- **Current:** Doesn't validate pincode not empty
- **Requirement:** Empty pincode returns 400
- **Fix:** Add upfront validation
- **File:** [services/pincode-service/src/controllers/pincode.controller.ts](services/pincode-service/src/controllers/pincode.controller.ts)

**RULE 6 VIOLATION: No Audit Log on Bulk Upload**
- **Current:** Bulk upload changes 5000+ records with zero audit trail
- **Requirement:** Log bulk upload action with record count
- **Fix:** Add `await auditLogRepo.insert()` after bulk upload completes
- **File:** [services/pincode-service/src/services/pincode.service.ts](services/pincode-service/src/services/pincode.service.ts#L42-L66)

---

### P3.3 — Support Service (0.5 days)

**Issue: Mobile Lookup Schema Too Restrictive**
- **Current:** [support.schemas.ts:19](services/support-service/src/schemas/support.schemas.ts#L19) `.max(10)` rejects '+919876543210'
- **Requirement:** Accept country code + phone number
- **Fix:** Change `.max(10)` to `.max(15)` OR preprocess to strip +91 prefix
- **File:** [services/support-service/src/schemas/support.schemas.ts](services/support-service/src/schemas/support.schemas.ts#L19)

**Optional: Case Status Updates Audit**
- **Current:** Not logged to audit trail
- **Consideration:** Support is agent-facing, may not need audit (optional enhancement)
- **If desired:** Add `await auditLogRepo.insert()` on status updates
- **File:** [services/support-service/src/services/support.service.ts](services/support-service/src/services/support.service.ts#L32-L37)

---

### P3.4 — Cross-Service Setup (1 day)

**Missing Dockerfiles (10/12 services)**
- **Current:** Only auth-service and notification-service have Dockerfiles
- **Required:** All 12 services must have Dockerfile for containerization
- **Fix:** Create Dockerfile for each service (standard Node.js multi-stage build)
- **Files:** Create at root of each service folder

**Missing .env Files (2/3 services)**
- **Current:** admin-service and support-service have no .env files
- **Required:** Every service must have .env (not sharing root .env)
- **Fix:** Create .env template for each service with required vars
- **Files:** Create [services/admin-service/.env](services/admin-service/.env), [services/support-service/.env](services/support-service/.env)

**Verify No Circular Dependencies**
- **Action:** Run dependency tree analysis, check service imports
- **Expected:** Auth → others (no reverse), Payment → Order (not vice versa)

**Verify Inter-Service HTTP Calls Work**
- **Tests Needed:**
  - Cart calls Catalog for prices/stock
  - Order calls Payment for amount
  - Return calls Order + Payment
  - All call shared package utilities

---

### P3.5 — Testing & Documentation (0.5 days)

**Create Integration Test Suite**
- Test complete user journeys (signup → browse → cart → order → tracking)
- Test return flow (initiate → 7-day check → refund)
- Test admin flows (create product with fabric fields → adjust inventory → view dashboard)
- Test webhook handlers (Razorpay, Shiprocket)

**Update API Documentation**
- Verify all endpoints match [FabricSpeaks_APIDesign_v1.1.md](Documents/FabricSpeaks_APIDesign_v1.1.md)
- Add fabric fields to product endpoints
- Add guest tracking endpoint documentation
- Update status machine documentation (new state names)

---

## Verification Checklist

### Automated Tests
- [ ] Unit tests pass for all fixed functions
- [ ] Integration tests pass for critical paths
- [ ] Security tests: timing attack resistance, SQL injection, CSRF
- [ ] Load test: no performance regressions on fixed code

### Manual Verification
- [ ] End-to-end customer journey (signup → product view → cart → order)
- [ ] Return flow with 7-day window tests
- [ ] Admin flows (product creation, inventory adjust, dashboard queries)
- [ ] Webhook testing (Razorpay, Shiprocket payloads)
- [ ] Rate limit testing (exceed limits, verify 429 responses)

### Database
- [ ] All migrations run successfully on staging
- [ ] No data loss from enum renames
- [ ] All new columns nullable or have defaults
- [ ] Indexes present on frequently queried fields

### Pre-Launch Gate
- [ ] All P0 & P1 issues fixed & tested ✅
- [ ] 0 RULE violations ✅
- [ ] All 12 services have Dockerfiles & .env files ✅
- [ ] No hardcoded secrets ✅
- [ ] End-to-end test suite passes ✅
- [ ] Security scan (OWASP Top 10) passes ✅
- [ ] Performance baseline established ✅
- [ ] Documentation updated ✅

---

## Implementation Notes

### Key Decisions
1. **Fabric fields:** Use JSONB mapping (no new columns needed)
2. **Status enum:** Rename in DB (PACKED→PROCESSING, RETURNED→REFUNDED, add RETURN_PICKED, RETURN_RECEIVED)
3. **Guest tracking:** Add 3 columns (guest_mobile, guest_address, tracking_token)
4. **Shiprocket webhook:** HMAC + IP whitelist (standard + secure)
5. **Refunds:** Call Payment service async (prevents blocking orders)

### Dependencies Between Fixes
- **Auth must complete first** (JWT is foundation for all authenticated services)
- **Payment fixes** can be parallel (independent of Order)
- **Catalog fixes** must precede Cart (prices depend on catalog)
- **Order + Return** are interdependent (return references order status machine)
- **Admin Dashboard** depends on Order, Return, Inventory queries being available

### Risk Mitigation
- All database migrations tested on staging first
- Rollback plan for each migration (backup + reverse scripts)
- Feature flags for new Shiprocket/Payment logic (can disable if issues)
- Monitoring alerts on webhook failures (immediate notification of issues)

---

## Timeline Estimate

| Phase | Tasks | Days | Dependencies |
|-------|-------|------|--------------|
| **P1** | Auth (1), Payment (1), Catalog (1), Cart (1), Order (1.5) | **5** | None |
| **P2** | Order cont'd (2), Return (2), Admin (0.5), Inventory (0.5) | **4** | P1 complete |
| **P3** | Search (0.5), Pincode (0.5), Support (0.5), Dockerfiles (1), Tests (0.5) | **3** | P1+P2 complete |
| **Total** | All 12 services + tests | **12** | — |

**Buffer:** +2-3 days for unforeseen issues = **14-15 days total**

---

## Approval Checklist

- [ ] All critical security issues understood (timing attacks, webhook validation)?
- [ ] RULE violations acknowledged (price time-locking, audit logging, user_id from JWT)?
- [ ] Database migration strategy approved (enum renames, new columns)?
- [ ] Service priority order accepted (Phase 1 → 2 → 3)?
- [ ] Team capacity: 2 senior engineers, 1 QA for 2 weeks?
- [ ] Ready to begin Phase 1 implementation?

---

**Status:** DRAFT — Awaiting approval to proceed with implementation.
