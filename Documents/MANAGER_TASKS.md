# FABRIC SPEAKS — ANTIGRAVITY MANAGER VIEW
# Pre-written task breakdown for parallel agent dispatch
# Use Manager View → New Agent → paste the task block

---

## HOW TO USE THIS FILE

1. Open Antigravity Manager View
2. Click "+ New Agent" for each parallel task
3. Paste the task block into the agent prompt
4. Always attach RULES.md + the relevant SKILL file as context
5. Let agents work in parallel — Agent A on Auth while Agent B does migrations

---

## WEEK 1 — FOUNDATION

### TASK W1-A: Monorepo Scaffold + Shared Package
Context files: RULES.md, SKILLS/db-skill.md
```
Set up the Fabric Speaks monorepo from scratch.

1. Init root package.json with npm workspaces: ["shared", "services/*", "frontend"]
2. Create tsconfig.base.json with strict:true, noUncheckedIndexedAccess:true, paths for @fs/shared
3. Create .eslintrc.js with import/order rule
4. Create .prettierrc
5. Create shared/package.json as @fs/shared
6. Create shared/src/ with these files:
   - errors.ts: AppError class + ErrorCode enum (all 32 codes from API Design v1.1 Section 1.5)
   - types.ts: Role type, OrderStatus enum, ReturnStatus enum, shared interfaces
   - db.ts: pg Pool factory that reads DB_HOST + DB_PASSWORD from process.env
   - redis.ts: ioredis client factory
   - logger.ts: structured logger with maskMobile() and maskEmail() functions
   - pricing.ts: getEffectivePrice(variant) function — sale_price if sale_active, else price_override, else base_price
   - middleware.ts: requireAuth and requireRole Express middleware
7. Create docker-compose.yml: PostgreSQL 15 on 5432, Redis 7 on 6379
8. Create .env.example with all variable names (no values)

Follow RULES.md conventions exactly.
```

### TASK W1-B: Database Migrations — Core Schema
Context files: RULES.md, SKILLS/db-skill.md, attach LLD v1.1
```
Create the initial database migrations for Fabric Speaks.

Read LLD v1.1 Section 2 for the complete DDL. Create these migration files in db/migrations/:

1. 20250101000001_initial_schema.sql
   - users table (with mobile_hash GENERATED ALWAYS column)
   - addresses table
   - consent_log table (INSERT-only design noted in comment)

2. 20250101000002_catalog.sql
   - brands table
   - categories table (self-referencing parent_id)
   - products table (with JSONB attributes column + GIN index)
   - variants table (size, colour, qty, base_price, sale_price, sale_active)

3. 20250101000003_orders.sql
   - orders table (state machine — status CHECK constraint)
   - order_items table
   - stock_adjustments table (reason NOT NULL enforced)

4. 20250101000004_payments_returns.sql
   - payments table
   - returns table
   - return_items table

5. 20250101000005_collections_notifications.sql
   - collections table
   - collection_products table
   - wishlist table
   - notification_log table
   - admin_audit_log table (INSERT-only)

Follow ALL design rules from LLD Section 2.1: UUID PKs on PII entities, GIN indexes on JSONB, soft delete on all customer tables.
Add npm script in root package.json: "db:migrate": "node-pg-migrate up"
```

### TASK W1-C: CI/CD Setup
Context files: RULES.md, DevOps Runbook v1.0
```
Create GitHub Actions workflows for Fabric Speaks.

1. .github/workflows/test.yml
   - Runs on every push + PR
   - Spins up postgres:15-alpine and redis:7-alpine as services
   - Runs: npm ci → npm run lint → npm run typecheck → npm run test
   - Sets correct env vars for test DB connection

2. .github/workflows/build.yml
   - Runs on push to develop or main only
   - Authenticates to GCP Artifact Registry via Workload Identity Federation
   - Builds Docker image for each service (loop)
   - Pushes to asia-south1-docker.pkg.dev/PROJECT_ID/fabricspeaks/{service}:{sha}

3. .github/workflows/deploy.yml
   - Staging: auto-deploys on develop push (no approval)
   - Production: requires manual approval gate via GitHub Environments
   - Runs DB migrations before deploying
   - Runs smoke test after deploying

Follow DevOps Runbook Section 8 exactly.
```

---

## WEEK 2 — AUTH + CATALOG

### TASK W2-A: Auth Service
Context files: RULES.md, SKILLS/service-skill.md, SKILLS/db-skill.md, attach API Design v1.1 (AUTH section), Security Design v1.0
```
Implement the complete Auth Service for Fabric Speaks.

Service location: services/auth-service/
API endpoints to implement (see API Design v1.1):
- AUTH-01: POST /auth/otp/send
- AUTH-02: POST /auth/otp/verify (issues JWT httpOnly cookie on success)
- AUTH-03: POST /auth/logout
- AUTH-04: GET /auth/me
- AUTH-05: PATCH /auth/me
- AUTH-06: DELETE /auth/account (DPDPA deletion)

Key implementation details:
- OTP: generate 6-digit code, store in Redis as otp:{mobile} with 120s TTL
- Rate limiting: otp_rate:{mobile} (3/10min) and otp_rate_ip:{ip} (5/10min) in Redis
- Firebase: use firebase-admin to send OTP via Firebase Phone Auth
- JWT: issue with claims {userId, role, mobile (masked), iat, exp: 30 days}
  Set as httpOnly Secure SameSite=Strict cookie
- CSRF: generate token, return in response header, validate on mutations
- Account deletion: set mobile → sha256 hash, name/email → NULL, is_deleted = true
  (DPDPA compliance — see Security Design Layer 3)

Follow all 6 RULES from RULES.md. Use @fs/shared for errors, db, redis, logger.
Write unit tests for OTP rate limiting and JWT issuance.
```

### TASK W2-B: Catalog Service
Context files: RULES.md, SKILLS/service-skill.md, SKILLS/db-skill.md, attach API Design v1.1 (CAT section)
```
Implement the Catalog Service for Fabric Speaks.

Service location: services/catalog-service/
Endpoints to implement:
- CAT-01: GET /products (list with filters + pagination)
- CAT-02: GET /products/:slug (PDP data)
- CAT-03: POST /admin/products (create)
- CAT-04: PATCH /admin/products/:id (update)
- CAT-05: POST /admin/products/:id/deactivate (soft delete)
- CAT-06: POST /admin/products/:id/duplicate
- CAT-07: PATCH /admin/products/bulk-sale
- CAT-09A: POST /admin/products/:id/variants
- CAT-09B: PATCH /admin/variants/:id
- CAT-09C: DELETE /admin/variants/:id (soft deactivate)
- CAT-10/11: GET /brands, GET /brands/:id
- CAT-12: GET /categories/tree
- CAT-13A: POST /admin/brands
- CAT-14/15: POST/PATCH /admin/categories

Key rules:
- RULE 1: getEffectivePrice() for all variant pricing
- RULE 6: auditLog.insert() on every admin mutation
- Image upload: accept image file → compress to WebP → upload to Cloud Storage → store CDN URL
- SKU auto-generation on variant create: {BRAND_CODE}-{SIZE}-{COLOUR_CODE}
- Deactivation cascade: check for pending orders before deactivating, notify wishlists
```

---

## WEEK 3 — CART + SEARCH + PINCODE

### TASK W3-A: Cart + Pincode + Search Services
Context files: RULES.md, SKILLS/service-skill.md, attach API Design v1.1 (CART, SRC, PIN sections)
```
Implement 3 services in parallel tabs:

CART SERVICE (services/cart-service/):
- CART-01: GET /cart — returns items with live prices + stockWarnings
- CART-02: POST /cart/items — upsert item (guest: Redis 7d, auth: DB)
- CART-03: PATCH /cart/items/:variantId — update qty (0 = delete item)
- CART-04: DELETE /cart — clear cart
Key: STOCK_UNAVAILABLE is NOT thrown at cart add — only stockWarnings in response.
Guest cart: Redis key cart:guest:{sessionId}. On login: merge guest cart into DB cart.

PINCODE SERVICE (services/pincode-service/):
- PIN-01: GET /pincode/check?pincode=&productId= — Shiprocket serviceability check
Cache response in Redis: pincode:{pin} for 24 hours.
If not cached: call Shiprocket API → cache → return {serviceable, cod, estimatedDays}.

SEARCH SERVICE (services/search-service/):
- SRC-01: GET /search?q=&page&limit=24&sort&filter[fabric]
  Full-text search on products using PostgreSQL ts_vector. Filter by fabric, brand, sale, price range.
- SRC-02: GET /search/suggestions?q= — returns up to 5 suggestions, cached 10min in Redis.
```

---

## WEEK 4 — ORDER + PAYMENT

### TASK W4-A: Order Service
Context files: RULES.md, SKILLS/service-skill.md, attach API Design v1.1 (ORD section), LLD sequence diagram Section 5.2
```
Implement the Order Service for Fabric Speaks.

Service location: services/order-service/
Endpoints:
- ORD-01: POST /orders — place order with server-side pricing + atomic stock reservation
- ORD-02: GET /orders — list user's orders
- ORD-03: GET /orders/:orderId — order detail
- ORD-04: GET /orders/:orderId/track — guest tracking
- ORD-05: GET /orders/:orderId/guest-track — OTP-gated guest tracking
- ORD-06: POST /orders/:orderId/cancel — COD only, within 30min window
- ORD-07: PATCH /orders/:orderId/switch-to-cod
- ORD-08: GET /admin/ops — daily ops dashboard (5 panels)

ORD-01 is the most critical. It must:
1. Re-calculate all prices server-side (RULE 1 — never trust cart prices)
2. Validate stock atomically with row-level lock (SELECT ... FOR UPDATE)
3. Deduct stock in same transaction
4. Create order + order_items in same transaction
5. Queue post-order notifications to BullMQ (fire-and-forget)
6. Return order with Razorpay order ID for payment

COD fraud detection: if user has ≥2 cancelled COD orders → set cod_fraud_flag=true, add to Fraud Review Queue.
```

### TASK W4-B: Payment Service
Context files: RULES.md, SKILLS/service-skill.md, SKILLS/api-skill.md, attach API Design v1.1 (PAY section)
```
Implement the Payment Service for Fabric Speaks.

Service location: services/payment-service/
Endpoints:
- PAY-01: POST /payments/razorpay-order — create Razorpay order for existing FS order
- PAY-02: GET /payments/:id/status — payment status (poll pattern, 2s intervals up to 30s)
- PAY-03: POST /admin/payments/refund — superAdmin only
- PAY-04: POST /webhooks/razorpay — HMAC SHA256 validated + idempotency key

PAY-04 webhook flow (see SKILLS/api-skill.md for pattern):
1. Validate X-Razorpay-Signature FIRST
2. Check idempotency (razorpay_payment_id already processed? return 200)
3. Queue to BullMQ (razorpayWebhookQueue)
4. Return 200 immediately

Worker processes: CAPTURED → update order status CONFIRMED, release stock reservation
FAILED → update status, notify user, offer retry/COD switch.

Polling pattern: frontend polls PAY-02 every 2s after Razorpay SDK callback. Max 30s.
CAPTURED = success, timeout = show "processing" state, FAILED = failure UI.
```

---

## WEEK 5 — ADMIN + NOTIFICATIONS + FRONTEND

### TASK W5-A: Frontend Shell + Auth Screens
Context files: RULES.md, SKILLS/frontend-api-skill.md, Screen Prompt Pack v1.0 (SCR-18 Login, global spec)
```
Build the Next.js 14 frontend shell + auth screens for Fabric Speaks.

1. Set up Next.js 14 App Router in frontend/
2. Install: framer-motion, @tanstack/react-query, tailwindcss
3. Set up CSS variables from Screen Prompt Pack Global Spec
4. Import DM Serif Display + DM Sans + DM Mono from Google Fonts
5. Create SpiderLoader component (see Screen Prompt Pack Global Spec for SVG code)
6. Create MagneticButton component
7. Create page transition wrapper with curtain wipe animation

Then build SCR-18 (Login/OTP) using its AI Prompt from Screen Prompt Pack v1.0.
Then build SCR-01 (Homepage) shell with SpiderLoader placeholder while data loads.

All Framer Motion animations must match Screen Prompt Pack specs exactly.
```

### TASK W5-B: Notification Service (Email + SMS only, no WhatsApp for v1)
Context files: RULES.md, SKILLS/service-skill.md, attach API Design v1.1 (NOT section)
```
Implement Notification Service v1 for Fabric Speaks (Email + SMS only — WhatsApp post-launch).

Service location: services/notification-service/
Implement:
- NOT-01: POST /notifications/consent
- NOT-02: GET /notifications/consent
- NOT-03: GET /notifications (list, cursor-based)
- NOT-03A: PATCH /notifications/mark-read
- BullMQ worker: processes order-notifications queue

For v1 launch:
- Email via SMTP (nodemailer): ORDER_CONFIRMED, SHIPPED, DELIVERED, RETURN_INITIATED
- SMS via MSG91: ORDER_CONFIRMED (critical — customer needs order number)
- Skip WhatsApp for now (template approval takes 3-7 days)

Each notification must be logged to notification_log table.
Respect consent_log — check user's opt-in status before sending.
```

---

## VERIFICATION PROMPTS (run after each week)

After each week, dispatch this agent:
```
Verify the Fabric Speaks implementation so far.

Run these checks:
1. npm run typecheck — must be 0 errors
2. npm run lint — must be 0 warnings/errors
3. npm run test — all tests must pass
4. docker-compose up -d && npm run db:migrate — migrations must apply cleanly
5. Call GET /health on each implemented service — must return 200

Report any failures with the file and line number.
Fix all issues before marking the week complete.
```
