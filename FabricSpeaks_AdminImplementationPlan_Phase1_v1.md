# Fabric Speaks — Admin Implementation Master Plan
**Phase 1: Store Can Open**  
**Version:** 1.0 · March 2026  
**Goal:** Production-ready admin software — catalog, orders, returns, notifications  

---

## HOW TO USE THIS DOCUMENT

Each step follows this exact sequence:

```
1. ATTACH      → files to load into agent context
2. IMPLEMENT   → implementation prompt (paste into agent)
3. VERIFY BUILD → build check prompt (paste after implementation)
4. FIX         → if build fails, paste fix prompt
5. CROSS-CHECK → final verification against design docs
```

Never skip VERIFY BUILD. Never skip CROSS-CHECK.  
If VERIFY BUILD fails, run FIX before moving to the next step.  
Do not start Step N+1 until Step N passes CROSS-CHECK.

---

## PREREQUISITE — AGENT CONTEXT SETUP

Before any step, your agent must have these loaded as permanent context:

```
ALWAYS ATTACHED (every single prompt):
  .cursorrules / RULES.md          ← the 6 non-negotiable rules
  SKILLS/db-skill.md               ← repository pattern, migrations
  SKILLS/service-skill.md          ← service layer patterns
  SKILLS/frontend-api-skill.md     ← frontend API patterns

ATTACH PER STEP (listed in each step below):
  LLD v1.1                         ← DB schema, data models
  API Design v1.1                  ← endpoint contracts
  CDD v1.1                         ← component names and specs
  Screen Prompt Pack v1.0          ← screen-by-screen UI specs
  HDD v1.0                         ← why each feature exists
  Admin Feature Master List v1.0   ← feature status and priority
```

---

## PHASE 1 OVERVIEW

```
Step 1   Variant Matrix + Bulk Update         (CAT-04, CAT-05)
Step 2   Store Settings Page                  (SET-01 to SET-04)
Step 3   Order Operations                     (ORD-07, ORD-12, ORD-13, ORD-14, ORD-16)
Step 4   Returns & Refund Timeline            (RET-08 to RET-12)
Step 5   Admin WhatsApp Notifications         (NOT-01, NOT-02, NOT-04, NOT-05, NOT-06)
Step 6   Phase 1 End-to-End Verification      (smoke test all above)
```

---

---

# STEP 1 — VARIANT MATRIX + BULK UPDATE

**Features:** CAT-04, CAT-05  
**Roles affected:** Super Admin, Inventory Manager  
**Design doc reference:** Delta_BulkVariantUpdate_v1.md (already created)  
**HDD reference:** Persona 4 (Brand Admin P0), Persona 9 (Inventory Manager P1)

---

## STEP 1A — BACKEND: Variant Matrix Endpoints

### Attach These Files
```
RULES.md
SKILLS/service-skill.md
SKILLS/db-skill.md
API Design v1.1 (Catalog section)
LLD v1.1 (variants table, products table schema)
Delta_BulkVariantUpdate_v1.md
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are implementing backend changes for the Fabric Speaks catalog service.
Reference document: Delta_BulkVariantUpdate_v1.md (attached).
Follow ALL 6 RULES from RULES.md at all times.
Use SKILLS/service-skill.md for service layer patterns.
Use SKILLS/db-skill.md for repository patterns.

CONTEXT:
Currently CAT-07 POST /admin/products creates one variant at a time.
We need it to accept a variants array and create all in one DB transaction.
We also need a new endpoint PATCH /admin/products/:id/variants/bulk
for updating stock/price/image on multiple variants of one product.

TASK 1 — Update schemas/catalog.schemas.ts:
Add VariantItemSchema and update CreateProductSchema to require
a variants array (min 1). Add BulkUpdateVariantsSchema.
Exact schemas are in Delta_BulkVariantUpdate_v1.md Section 3.1.
Do NOT change any existing schema fields — only add variants array.

TASK 2 — Update repositories/variant.repository.ts:
Add bulkCreate(productId, variants, client) method.
Add bulkUpdate(updates, adminUserId) method.
Add verifyBelongToProduct(variantIds, productId) method.
Exact implementation in Delta_BulkVariantUpdate_v1.md Section 3.2.
All DB queries must use parameterised placeholders — no string concat.
bulkUpdate must emit stock.low to notificationQueue when qty < 5.

TASK 3 — Update services/catalog.service.ts:
Modify createProduct to run product creation + variant creation
in a single DB transaction. If any variant fails, roll back everything.
Add bulkUpdateVariants method with ownership verification.
Exact implementation in Delta_BulkVariantUpdate_v1.md Section 3.3.

TASK 4 — Update controllers/catalog.controller.ts:
Add bulkUpdateVariants controller method.
Must write to audit_log on every call (RULE 6).

TASK 5 — Update routes/catalog.routes.ts:
Add PATCH /admin/products/:id/variants/bulk route.
Gate with requireAuth + requireRole(['SUPER_ADMIN','INVENTORY_MANAGER']).

CONSTRAINTS:
- Do NOT change CAT-01 through CAT-06 read endpoints
- Do NOT change any other service files
- Do NOT add new npm packages without listing them first
- All errors must use AppError from @fs/shared/errors
- All responses must use { success: true, data } shape (RULE 5)

OUTPUT:
List every file modified with the exact changes made.
Do not show unchanged files.
```

---

### Verify Build Prompt (Run after implementation)

```
The following backend changes were just implemented for catalog-service:
- schemas/catalog.schemas.ts updated
- repositories/variant.repository.ts updated
- services/catalog.service.ts updated
- controllers/catalog.controller.ts updated
- routes/catalog.routes.ts updated

Run these verification steps and report results:

STEP 1 — TypeScript compilation
Run: npx tsc --noEmit in services/catalog-service/
Expected: zero errors
If errors exist: list each error with file + line + fix

STEP 2 — Lint check
Run: npx eslint src/ in services/catalog-service/
Expected: zero errors, zero warnings
If warnings exist: list each with fix

STEP 3 — Unit tests
Run: npx vitest run src/__tests__/unit/
Expected: all existing tests still pass
If any test fails: show which test, what error, what fix

STEP 4 — Schema validation check
Manually verify:
  [ ] CreateProductSchema rejects body with no variants field
  [ ] CreateProductSchema rejects body with empty variants array
  [ ] BulkUpdateVariantsSchema rejects empty variants array
  [ ] All 6 fabric fields still required (regression)

STEP 5 — Route registration check
Verify in routes/catalog.routes.ts:
  [ ] PATCH /admin/products/:id/variants/bulk is registered
  [ ] requireAuth middleware is present
  [ ] requireRole(['SUPER_ADMIN','INVENTORY_MANAGER']) is present

Report: PASS or FAIL for each step.
For every FAIL: exact error + exact fix.
Do not proceed to Step 1B until all 5 steps PASS.
```

---

### Fix Prompt (Only if Verify Build fails)

```
The build verification for Step 1A backend failed.
Here are the errors found: [PASTE ERRORS HERE]

Fix each error following these rules:
- Only change files listed in the error
- Do not refactor working code
- Do not change test files to make tests pass — fix the source
- After each fix, explain what was wrong and why the fix is correct
- Reference RULES.md to confirm the fix does not violate any rule
- Reference Delta_BulkVariantUpdate_v1.md to confirm fix aligns with spec

After fixes, list every file changed and the exact line-level diff.
```

---

### Cross-Check Prompt (Final verification for Step 1A)

```
Cross-check the completed Step 1A backend against these design documents:
- Delta_BulkVariantUpdate_v1.md
- API Design v1.1 (Catalog section)
- LLD v1.1 (variants table)
- RULES.md

CHECK 1 — Against Delta document Section 3 (Backend Changes):
  [ ] All 5 tasks from the delta are implemented
  [ ] No extra changes were made beyond the delta scope
  [ ] Variant ownership check exists before bulk update

CHECK 2 — Against API Design v1.1:
  [ ] CAT-07 POST /admin/products matches spec (now accepts variants array)
  [ ] New endpoint PATCH /admin/products/:id/variants/bulk is correctly structured
  [ ] Response shapes match { success: true, data: {} } contract

CHECK 3 — Against LLD v1.1:
  [ ] Queries use correct column names from variants table
  [ ] Transaction uses version column for optimistic locking
  [ ] stock_qty field name matches LLD exactly

CHECK 4 — Against RULES.md:
  [ ] RULE 1: try/catch on every controller method ✓
  [ ] RULE 2: Zod validation before service call ✓
  [ ] RULE 3: no raw SQL outside repositories ✓
  [ ] RULE 4: no hardcoded secrets ✓
  [ ] RULE 5: consistent response shape ✓
  [ ] RULE 6: audit_log written on bulkUpdateVariants ✓

For every item not matching: show the gap and the exact fix.
PASS only when all 4 checks are clean.
```

---

## STEP 1B — FRONTEND: Variant Matrix UI

### Attach These Files
```
RULES.md
SKILLS/frontend-api-skill.md
CDD v1.1 (VariantMatrix component, ColourImageUpload)
Screen Prompt Pack v1.0 (SCR-21 Product Form)
Delta_BulkVariantUpdate_v1.md
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are implementing the frontend Variant Matrix component for the
Fabric Speaks admin console. This replaces the single-variant form
on SCR-21 Product Form.
Reference: Delta_BulkVariantUpdate_v1.md Section 4.
Reference: CDD v1.1 for component names and design tokens.
Reference: Screen Prompt Pack SCR-21 for the full product form spec.
Follow ALL 6 RULES from RULES.md.
Use SKILLS/frontend-api-skill.md for API call patterns.

Design tokens to use (from CDD v1.1):
  --fs-void: #0A0A0A (background)
  --fs-surface: #111111
  --fs-surface-2: #1A1A1A
  --fs-linen: #C9A96E (accent, borders, labels)
  --fs-ivory: #F0EBE3 (text)
  --fs-ash: #6B6560 (secondary text)
  --fs-wire: #252525 (borders)
  --fs-error: #B84C3C

TASK 1 — Create apps/web/components/admin/VariantMatrix.tsx
This is a grid component: sizes as columns, colours as rows.
Each cell = editable stock qty input (number, min 0).
Each row = one colour with an image upload button.

Exact props interface (from delta doc Section 4.1):
  sizes: string[]
  colours: string[]
  values: VariantCell[][]
  onChange: (values: VariantCell[][]) => void
  onImageUpload: (colour: string, file: File) => Promise<string>
  mode: 'create' | 'edit'
  loading?: boolean

UI requirements:
  - Size selector row at top (checkbox per size — toggle on/off)
  - "+ Add Colour" button adds a new colour row
  - Each colour row: colour name input + image upload + stock cells
  - SKU auto-generated as {productCode}-{colour}-{size}
    Admin can override SKU by clicking the cell
  - "Save All" button at bottom
    Disabled until at least 1 cell has stock value entered
  - SpiderLoader shown during save (from CDD v1.1)
  - Success toast on complete
  - Per-cell error highlight if specific variant fails

Mobile requirements:
  - Horizontal scroll on the matrix grid
  - First column (colour name + image) is sticky (position: sticky)
  - All input cells minimum height 44px (touch target)
  - Tested at 320px minimum viewport width
  - No horizontal overflow on page — only within the matrix

Browser support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

TASK 2 — Create apps/web/components/admin/ColourImageUpload.tsx
Small image upload per colour row in the matrix.
Shows thumbnail preview after upload.
Validates: JPEG/PNG/WebP only, max 5MB before upload.
Calls the GCS upload endpoint.
Returns URL on success, shows error message on failure.

Exact props (from delta doc Section 4.2):
  colour: string
  currentImageUrl?: string
  onUpload: (url: string) => void
  onError: (message: string) => void

TASK 3 — Update apps/web/app/admin/products/[id]/page.tsx
Replace single variant form section with VariantMatrix component.
Section order: Product Details → Variants (matrix) → Pricing → Media
Add "Different price per variant" toggle in Pricing section.
If toggled on, price column appears in matrix grid.
All API calls through typed API client — no raw fetch (RULE from
SKILLS/frontend-api-skill.md).

TASK 4 — Update apps/web/lib/api/catalog.api.ts
Add bulkUpdateVariants function.
Exact shape from delta doc Section 4.4.

CONSTRAINTS:
- Use only design tokens from CDD v1.1 — no arbitrary hex codes
- Use Framer Motion for all animations (already in project)
- No new npm packages without listing them first
- CurtainWipe transition on page enter (from CDD v1.1)
- SpiderLoader replaces all loading spinners
- MagneticButton for all primary CTAs (from CDD v1.1)

OUTPUT:
List every file created or modified.
Show the complete code for VariantMatrix.tsx and ColourImageUpload.tsx.
Show only the changed sections for modified files.
```

---

### Verify Build Prompt

```
The following frontend changes were just implemented:
- apps/web/components/admin/VariantMatrix.tsx (new)
- apps/web/components/admin/ColourImageUpload.tsx (new)
- apps/web/app/admin/products/[id]/page.tsx (modified)
- apps/web/lib/api/catalog.api.ts (modified)

Run these checks:

STEP 1 — TypeScript compilation
Run: npx tsc --noEmit in apps/web/
Expected: zero errors

STEP 2 — Lint
Run: npx eslint components/admin/VariantMatrix.tsx
     npx eslint components/admin/ColourImageUpload.tsx
Expected: zero errors

STEP 3 — Component render check
Verify VariantMatrix renders without error with these props:
  sizes: ['S','M','L']
  colours: ['White','Black']
  values: [[{stock:0},{stock:0},{stock:0}],[{stock:0},{stock:0},{stock:0}]]
  onChange: () => {}
  onImageUpload: async () => 'http://test.com/img.webp'
  mode: 'create'
Expected: no console errors, grid renders 2 rows × 3 columns

STEP 4 — Design token check
Scan VariantMatrix.tsx and ColourImageUpload.tsx:
  [ ] No hardcoded hex colours (must use CSS variables)
  [ ] No hardcoded font families (must use DM Serif Display / DM Sans)
  [ ] SpiderLoader used — not a custom spinner
  [ ] MagneticButton used for Save All — not a plain button

STEP 5 — Mobile check
Verify in VariantMatrix.tsx:
  [ ] overflow-x: auto or scroll on matrix wrapper
  [ ] position: sticky on first column
  [ ] min-height: 44px on input cells

Report PASS/FAIL for each. For every FAIL: exact fix.
```

---

### Cross-Check Prompt

```
Cross-check completed Step 1B frontend against design documents:
- Delta_BulkVariantUpdate_v1.md Section 4
- CDD v1.1
- Screen Prompt Pack SCR-21

CHECK 1 — Against delta Section 4 (Frontend Changes):
  [ ] All 4 tasks implemented
  [ ] VariantMatrix props match exact interface in delta
  [ ] ColourImageUpload props match exact interface in delta
  [ ] bulkUpdateVariants API function matches delta spec

CHECK 2 — Against CDD v1.1:
  [ ] VariantMatrix uses SpiderLoader from CDD
  [ ] VariantMatrix uses MagneticButton from CDD
  [ ] All design tokens from CDD (not hardcoded)
  [ ] CurtainWipe used on page enter

CHECK 3 — Against Screen Prompt Pack SCR-21:
  [ ] Section order matches SCR-21 spec
  [ ] All existing SCR-21 fields still present (regression)
  [ ] Variant section replaces old single-variant form

CHECK 4 — Acceptance criteria from delta Section 7:
  [ ] Desktop renders correctly
  [ ] Mobile horizontally scrollable at 320px
  [ ] Colour image upload shows thumbnail
  [ ] Save All disabled until 1 variant filled
  [ ] Loading state during API call
  [ ] Success toast on complete
  [ ] Per-variant error shows in correct cell

PASS only when all checks clean.
```

---

---

# STEP 2 — STORE SETTINGS PAGE

**Features:** SET-01, SET-02, SET-03, SET-04  
**Roles affected:** Super Admin only  
**Why this first:** GST invoices, COD toggle, and free shipping logic all depend on these settings. Nothing downstream works correctly without them.  
**HDD reference:** Persona 4 (Brand Admin P0)

---

## STEP 2A — BACKEND: Settings Service

### Attach These Files
```
RULES.md
SKILLS/service-skill.md
SKILLS/db-skill.md
API Design v1.1 (Admin section)
LLD v1.1 (store_settings table if exists, or define new)
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are implementing a Store Settings feature for the Fabric Speaks
admin service. This is a new feature not yet in the codebase.
Follow ALL 6 RULES from RULES.md.
Reference API Design v1.1 Admin section for endpoint patterns.
Reference LLD v1.1 for data modelling conventions.
Use SKILLS/service-skill.md for service layer patterns.
Use SKILLS/db-skill.md for repository patterns.

CONTEXT:
The admin needs a settings page to configure store-wide values
that affect multiple services. These settings must be:
- Stored in Postgres (not hardcoded, not env vars)
- Cached in Redis with 5 min TTL (read on every request)
- Accessible by all services via admin-service API
- Only writable by SUPER_ADMIN role

TASK 1 — Create DB migration
File: db/migrations/[TIMESTAMP]_add_store_settings.sql

Create table store_settings:
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  key             VARCHAR(100) UNIQUE NOT NULL
  value           TEXT NOT NULL
  description     TEXT
  updated_by      UUID REFERENCES users(id)
  updated_at      TIMESTAMPTZ DEFAULT NOW()

Seed with these default rows:
  ('store_name',           'Fabric Speaks',    'Store display name')
  ('store_email',          '',                 'Store contact email')
  ('store_phone',          '',                 'Store contact phone')
  ('gst_number',           '',                 'GST registration number')
  ('free_shipping_above',  '999',              'Free shipping threshold in INR')
  ('cod_enabled',          'true',             'COD available globally')
  ('stock_alert_threshold','5',                'Low stock alert threshold')
  ('razorpay_live_mode',   'false',            'Toggle Razorpay live vs test mode')

TASK 2 — Create repository
File: services/admin-service/src/repositories/settings.repository.ts

Methods:
  getAll(): Promise<Setting[]>
  getByKey(key: string): Promise<Setting | null>
  upsert(key: string, value: string, adminUserId: string): Promise<Setting>
  getMultiple(keys: string[]): Promise<Record<string, string>>

All queries parameterised. No raw SQL in service layer.

TASK 3 — Create service
File: services/admin-service/src/services/settings.service.ts

Methods:
  getAllSettings(): Promise<Record<string, string>>
    → check Redis cache: settings:all (5 min TTL)
    → if miss: fetch from DB, cache result, return

  updateSetting(key: string, value: string, adminUserId: string)
    → validate key is in allowed list (prevent arbitrary key creation)
    → update DB
    → invalidate Redis cache: settings:all
    → write audit_log (RULE 6)

  getSettingValue(key: string): Promise<string>
    → used by other services internally
    → cached individually: setting:{key} (5 min TTL)

Allowed keys list (hardcoded constant — not from DB):
  store_name, store_email, store_phone, gst_number,
  free_shipping_above, cod_enabled, stock_alert_threshold,
  razorpay_live_mode

TASK 4 — Create controller + routes
File: services/admin-service/src/controllers/settings.controller.ts

Endpoints:
  GET  /admin/settings
       → returns all settings as key-value object
       → requireAuth + requireRole(['SUPER_ADMIN'])

  PATCH /admin/settings
       → body: { key: string, value: string }
       → validate key is in allowed list
       → requireAuth + requireRole(['SUPER_ADMIN'])

  GET  /admin/settings/public
       → returns ONLY: store_name, free_shipping_above, cod_enabled
       → NO auth required (used by storefront)

TASK 5 — Expose settings to other services
Add a helper in @fs/shared/config/settings.ts:

  async function getStoreSetting(key: string): Promise<string>
    → calls admin-service GET /admin/settings/public internally
    → or reads from Redis directly (shared Redis access)
    → used by cart-service for free_shipping_above
    → used by order-service for cod_enabled check

CONSTRAINTS:
- Settings keys are immutable — value only can change
- cod_enabled value is 'true' or 'false' (string) — parse carefully
- free_shipping_above is a string — parse to number before use
- All writes to audit_log (RULE 6)
- No settings stored in .env — .env only for infrastructure secrets

OUTPUT:
List every file created or modified with complete code.
```

---

### Verify Build Prompt

```
Store Settings backend was just implemented.
Verify the following:

STEP 1 — Migration check
  [ ] Migration file exists with correct timestamp prefix
  [ ] store_settings table has all 8 required columns
  [ ] All 8 default rows are in the seed
  [ ] Run: npm run migrate up — exits with 0

STEP 2 — TypeScript compilation
  Run: npx tsc --noEmit in services/admin-service/
  Expected: zero errors

STEP 3 — Endpoint check
  Verify these routes are registered:
  [ ] GET  /admin/settings (auth: SUPER_ADMIN)
  [ ] PATCH /admin/settings (auth: SUPER_ADMIN)
  [ ] GET  /admin/settings/public (no auth)

STEP 4 — Redis cache check
  In settings.service.ts:
  [ ] getAllSettings reads from Redis before DB
  [ ] Cache key: settings:all with 5 min TTL
  [ ] Cache invalidated after updateSetting call

STEP 5 — Security check
  [ ] Arbitrary keys cannot be set (allowed list enforced)
  [ ] PATCH /admin/settings with key='inject_sql' returns 400
  [ ] GET /admin/settings/public does NOT expose gst_number
  [ ] GET /admin/settings/public does NOT expose store_email

STEP 6 — Rule 6 check
  [ ] audit_log entry created on every PATCH /admin/settings call
  [ ] Entry contains: adminUserId, action='UPDATE_SETTING',
      entity='store_settings', diff={key, oldValue, newValue}

Report PASS/FAIL. For every FAIL: exact fix.
```

---

### Cross-Check Prompt

```
Cross-check Step 2A against:
- API Design v1.1 (Admin section)
- LLD v1.1
- RULES.md
- Admin Feature Master List v1.0 (SET-01 to SET-04)

CHECK 1 — Feature coverage:
  [ ] SET-01 Store name — covered by store_name key
  [ ] SET-02 GST number — covered by gst_number key
  [ ] SET-03 Free shipping threshold — covered by free_shipping_above key
  [ ] SET-04 COD global toggle — covered by cod_enabled key

CHECK 2 — Against LLD v1.1 conventions:
  [ ] Table naming follows LLD pattern
  [ ] UUID primary keys match LLD
  [ ] Timestamps match LLD (TIMESTAMPTZ not TIMESTAMP)
  [ ] Foreign key to users table correct

CHECK 3 — Against RULES.md:
  [ ] RULE 1: try/catch on all controllers ✓
  [ ] RULE 2: Zod validation on PATCH body ✓
  [ ] RULE 3: no raw SQL outside repository ✓
  [ ] RULE 4: no secrets hardcoded ✓
  [ ] RULE 5: consistent response shape ✓
  [ ] RULE 6: audit_log on every write ✓

CHECK 4 — Integration points:
  [ ] cart-service can read free_shipping_above from settings
  [ ] order-service can read cod_enabled from settings
  [ ] storefront can read store_name from public endpoint

PASS only when all checks clean.
```

---

## STEP 2B — FRONTEND: Store Settings Screen

### Attach These Files
```
RULES.md
SKILLS/frontend-api-skill.md
CDD v1.1
Admin Feature Master List v1.0
Screen Prompt Pack v1.0 (SCR-38 Admin Users — use same layout pattern)
```

### Implementation Prompt

```
You are building the Store Settings admin screen for Fabric Speaks.
This is a new screen — no existing screen to modify.
Follow ALL 6 RULES from RULES.md.
Use SKILLS/frontend-api-skill.md for all API calls.
Use CDD v1.1 for all component names and design tokens.
Use SCR-38 (Admin Users) as layout reference — same admin shell.

ROUTE: /admin/settings
ROLE GATE: SUPER_ADMIN only — redirect to /admin if other role

LAYOUT:
Standard admin shell (header + sidebar + content area).
Content area has these sections:

SECTION 1 — Store Identity
  Fields:
    Store Name       (text input, required)
    Contact Email    (email input)
    Contact Phone    (tel input, India format)
    GST Number       (text input, format: 15-char alphanumeric)
  Note below GST: "Used on all customer invoices"

SECTION 2 — Shipping & Payments
  Fields:
    Free Shipping Above  (number input, prefix ₹)
                         Helper: "Orders above this amount get free shipping"
    COD Enabled          (toggle switch — ON/OFF)
                         Helper: "Disable to turn off Cash on Delivery globally"
                         Warning shown when toggling OFF:
                         "This will disable COD for all pincodes immediately"

SECTION 3 — Inventory Alerts
  Fields:
    Stock Alert Threshold  (number input, min 1, max 100)
                           Helper: "Get WhatsApp alert when stock drops below this"

SECTION 4 — Advanced
  Fields:
    Razorpay Live Mode   (toggle — TEST/LIVE)
                         Warning shown when toggling to LIVE:
                         "Only enable this when you are ready to accept real payments"
                         Requires confirmation modal before switching to LIVE

UI BEHAVIOUR:
- Each section has its own Save button (not one global save)
  This prevents accidental bulk changes
- Save shows SpiderLoader during API call
- Success shows toast: "Settings saved"
- Unsaved changes show a yellow dot on the section header
- Page loads current values from GET /admin/settings on mount
- All inputs use design tokens from CDD v1.1

COD TOGGLE BEHAVIOUR:
- Toggle OFF → show confirmation modal:
  "Are you sure? This disables COD for all customers immediately."
  Two buttons: "Cancel" and "Yes, disable COD" (destructive red)
- Toggle ON → no confirmation needed

RAZORPAY LIVE MODE BEHAVIOUR:
- Toggle to LIVE → show confirmation modal with checklist:
  "Before switching to live mode, confirm:"
  [ ] Razorpay KYC is approved
  [ ] Bank account is linked
  [ ] Test payments have been verified
  "I confirm all of the above" checkbox must be checked before enabling
- Toggle to TEST → no confirmation needed

MOBILE:
- Single column layout on mobile
- Each section card stacks vertically
- Save button full width on mobile

API CALLS (all through typed API client):
  GET  /admin/settings       → load all values on mount
  PATCH /admin/settings      → save each section

CONSTRAINTS:
- No raw fetch — typed API client only (SKILLS/frontend-api-skill.md)
- Role gate: if role !== SUPER_ADMIN redirect to /admin/dashboard
- CurtainWipe on page enter
- SpiderLoader on initial data load
- MagneticButton for all Save buttons
- Use AppError shape for error display

OUTPUT:
Complete code for:
  apps/web/app/admin/settings/page.tsx
  apps/web/components/admin/SettingsSection.tsx (reusable section card)
  apps/web/lib/api/settings.api.ts (API functions)
```

---

### Verify Build Prompt

```
Store Settings frontend was just implemented.
Verify:

STEP 1 — TypeScript compilation
  Run: npx tsc --noEmit in apps/web/
  Expected: zero errors

STEP 2 — Route check
  [ ] /admin/settings route exists in Next.js App Router
  [ ] Page redirects non-SUPER_ADMIN to /admin/dashboard

STEP 3 — API integration
  [ ] GET /admin/settings called on page mount
  [ ] PATCH /admin/settings called per section save
  [ ] Typed API client used — no raw fetch anywhere

STEP 4 — Confirmation modal check
  [ ] COD toggle OFF shows confirmation modal
  [ ] Razorpay LIVE toggle shows checklist modal
  [ ] Modal cancel does NOT apply the change

STEP 5 — Design token check
  [ ] No hardcoded hex colours
  [ ] SpiderLoader used on initial load
  [ ] MagneticButton on Save buttons
  [ ] CurtainWipe on page enter

STEP 6 — Mobile check
  [ ] Single column layout at 375px viewport
  [ ] No horizontal overflow
  [ ] Save button full width on mobile

Report PASS/FAIL. For every FAIL: exact fix.
```

---

---

# STEP 3 — ORDER OPERATIONS

**Features:** ORD-07, ORD-09, ORD-12, ORD-13, ORD-14, ORD-16  
**Roles affected:** Super Admin  
**Why now:** Admin needs these before first real order. Packing slips and order timeline are day-one operational needs.  
**HDD reference:** Persona 4 (Brand Admin P0)

---

## STEP 3A — BACKEND: Order Operations Endpoints

### Attach These Files
```
RULES.md
SKILLS/service-skill.md
SKILLS/db-skill.md
API Design v1.1 (Order section)
LLD v1.1 (orders table, order_items table)
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are adding missing order operations to the Fabric Speaks
order-service. These are P0 features required before go-live.
Follow ALL 6 RULES from RULES.md.
Reference API Design v1.1 Order section for endpoint contracts.
Reference LLD v1.1 for data models.
Use SKILLS/service-skill.md for patterns.

EXISTING: ORD-01 through ORD-08 are already built.
DO NOT modify existing endpoints — only add new ones.

TASK 1 — Cancel Order (ORD-07)
PATCH /admin/orders/:orderId/cancel

Business rules:
  - Only CONFIRMED or PROCESSING orders can be cancelled
  - SHIPPED or DELIVERED orders cannot be cancelled
  - Cancellation requires a reason (required field)
  - On cancel: release stock (increment stock_qty back on variants)
  - On cancel: emit order.cancelled to notificationQueue
  - On cancel: if payment was captured, create refund via payment-service
  - Update order status to CANCELLED

Request body: { reason: string (required, min 10 chars) }
Role: SUPER_ADMIN only

TASK 2 — Order Timeline (ORD-16)
GET /admin/orders/:orderId/timeline
GET /orders/:orderId/timeline (customer facing — same data, auth required)

Returns array of timeline events:
  [{
    status: string,
    timestamp: string,
    actor: 'system' | 'admin' | 'courier',
    note: string (optional)
  }]

Source: query order_status_history table (create if not exists)
Every order status change must write to order_status_history.
Add migration to create order_status_history table:
  id, order_id, status, previous_status, actor_type,
  actor_id (nullable), note (nullable), created_at

TASK 3 — Packing Slip Data (ORD-12)
GET /admin/orders/:orderId/packing-slip

Returns structured data for packing slip generation (not PDF):
  {
    orderNumber: string,
    orderDate: string,
    customer: { name, phone, address (full formatted) },
    items: [{ productName, fabricType, size, colour, qty, sku }],
    totalItems: number,
    paymentMethod: string,
    codAmount: number | null,
    specialInstructions: string | null
  }

Frontend generates the printable view from this data.
Role: SUPER_ADMIN only

TASK 4 — Dashboard Widgets Data (ORD-13, ORD-14)
GET /admin/dashboard/pending-actions

Returns:
  {
    awaitingShiprocket: number,  // CONFIRMED orders not yet pushed
    awaitingShiprocketOrders: [{ id, orderNumber, customer, total, createdAt }],
    codPendingConfirmation: number,  // COD orders in PENDING_PAYMENT
    codPendingOrders: [{ id, orderNumber, customer, total, mobile }],
    failedPayments24h: number,
    openReturns: number
  }

This endpoint powers the dashboard warning widgets.
Role: SUPER_ADMIN, SUPPORT_AGENT (read only)

CONSTRAINTS:
- Do NOT modify existing ORD-01 through ORD-08
- All new endpoints follow same auth pattern as existing
- Cancel must be atomic — stock release + status change in one transaction
- Timeline events must be written on EVERY status change going forward
  Update all existing status change code to write timeline events

OUTPUT:
List every file modified or created.
Show migration files in full.
Show new repository methods in full.
```

---

### Verify Build Prompt

```
Order operations backend was just implemented.
Verify:

STEP 1 — Migration
  [ ] order_status_history migration file created
  [ ] Table has: id, order_id, status, previous_status,
      actor_type, actor_id, note, created_at
  [ ] Run: npm run migrate up → exits 0

STEP 2 — TypeScript compilation
  Run: npx tsc --noEmit in services/order-service/
  Expected: zero errors

STEP 3 — New endpoints registered
  [ ] PATCH /admin/orders/:orderId/cancel
  [ ] GET /admin/orders/:orderId/timeline
  [ ] GET /orders/:orderId/timeline
  [ ] GET /admin/orders/:orderId/packing-slip
  [ ] GET /admin/dashboard/pending-actions

STEP 4 — Cancel order business rules
  [ ] SHIPPED order cancel returns 400 with clear message
  [ ] Cancel without reason returns 400 (Zod validation)
  [ ] Cancel reason under 10 chars returns 400

STEP 5 — Timeline events
  [ ] Existing status change code now writes to order_status_history
  [ ] Timeline endpoint returns events sorted oldest first
  [ ] Actor type is correctly set (system/admin/courier)

STEP 6 — Rule 6
  [ ] Cancel order writes to audit_log
  [ ] Packing slip access writes to audit_log

Report PASS/FAIL with fixes.
```

---

## STEP 3B — FRONTEND: Order Management Screens

### Attach These Files
```
RULES.md
SKILLS/frontend-api-skill.md
CDD v1.1
Screen Prompt Pack v1.0 (SCR-28 Order Management, SCR-12 Order Detail)
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are updating existing order management screens and adding
new functionality for Fabric Speaks admin.
Follow ALL 6 RULES from RULES.md.
Use CDD v1.1 for all components and design tokens.
Use Screen Prompt Pack SCR-28 and SCR-12 as base specs.
Use SKILLS/frontend-api-skill.md for all API calls.

EXISTING SCREENS TO UPDATE:
  apps/web/app/admin/orders/page.tsx         (SCR-28)
  apps/web/app/admin/orders/[id]/page.tsx    (SCR-12)

CHANGE 1 — Dashboard Pending Actions Widget (SCR-27)
Update apps/web/app/admin/dashboard/page.tsx:
Add two new warning cards at the TOP of the dashboard
(above existing cards):

Card 1 — "Awaiting Shiprocket" (amber colour)
  Shows count of CONFIRMED orders not yet pushed to Shiprocket
  CTA: "View Orders →" → links to /admin/orders?filter=awaiting_shiprocket
  Refreshes every 60 seconds

Card 2 — "COD Pending Confirmation" (amber colour)
  Shows count of COD orders in PENDING_PAYMENT
  CTA: "View Orders →" → links to /admin/orders?filter=cod_pending
  Refreshes every 60 seconds

Data source: GET /admin/dashboard/pending-actions

CHANGE 2 — Order Cancel (SCR-28 + SCR-12)
Add Cancel Order button on SCR-12 (Order Detail):
  Visible only when order status is CONFIRMED or PROCESSING
  Button label: "Cancel Order" (destructive — use --fs-error colour)

On click: slide-up drawer (not modal) containing:
  Title: "Cancel Order #FS-XXXX"
  Warning: "This cannot be undone. Stock will be released."
  If payment captured: "A refund of ₹X will be initiated."
  Reason textarea (required, min 10 chars, placeholder: "Reason for cancellation...")
  Two buttons: "Keep Order" and "Cancel Order" (destructive)

On confirm: PATCH /admin/orders/:id/cancel
Show SpiderLoader during call.
On success: redirect to /admin/orders with toast "Order cancelled"

CHANGE 3 — Order Timeline (SCR-12)
Add Timeline section to SCR-12 Order Detail (below order items):
  Title: "Order Timeline"
  Vertical timeline component:
    Each event: timestamp (formatted) + status label + actor + note
    Most recent at top
    Colour coded:
      CONFIRMED/PROCESSING/SHIPPED → --fs-linen
      DELIVERED → --fs-success (#2D6A4F)
      CANCELLED/RETURN states → --fs-error

  Data source: GET /admin/orders/:id/timeline
  Show SpiderLoader while loading

CHANGE 4 — Packing Slip (SCR-12)
Add "Print Packing Slip" button on SCR-12:
  Position: top right of order detail, next to existing buttons
  Icon: printer icon (lucide-react Printer)

On click:
  1. Fetch GET /admin/orders/:id/packing-slip
  2. Open browser print dialog with formatted packing slip layout
  3. Print layout (separate CSS print media query):
     - White background (#FFFFFF) — not dark theme
     - Order number large at top
     - Customer name and address
     - Items table: Product | Fabric | Size | Colour | Qty | SKU
     - Payment method + COD amount if COD
     - Footer: "Packed by Fabric Speaks — Thank you for your order"
  4. After print dialog opens, no navigation change

CONSTRAINTS:
- All API calls through typed API client
- No raw fetch
- CurtainWipe on page enter
- SpiderLoader on all async loads
- MagneticButton on primary CTAs
- Print layout must not use dark theme colours

OUTPUT:
Show complete changes for each modified file.
Show new components created.
```

---

---

# STEP 4 — RETURNS & REFUND TIMELINE

**Features:** RET-08, RET-09, RET-10, RET-11, RET-12  
**Roles affected:** Super Admin, Support Agent  
**Why now:** Support agents need this on every customer call about returns.  
**HDD reference:** Persona 10 (Support Agent P2)

---

## STEP 4A — BACKEND: Return Timeline + Refund Status

### Attach These Files
```
RULES.md
SKILLS/service-skill.md
API Design v1.1 (Return section)
LLD v1.1 (returns table, payments table)
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are adding return timeline and refund tracking to the
Fabric Speaks return-service and support-service.
Follow ALL 6 RULES from RULES.md.
Reference API Design v1.1 Return section.
Reference LLD v1.1 for data models.

CONTEXT:
Support agents need to see the full return journey on every
customer call. They need the Razorpay refund ID and status
to answer "where is my refund" questions.

TASK 1 — Return Timeline
GET /returns/:returnId/timeline
GET /admin/returns/:returnId/timeline

Add return_status_history table (migration):
  id, return_id, status, previous_status, actor_type,
  actor_id (nullable), note (nullable), created_at

Every return status change must write to this table.
Timeline response:
  [{
    status: string,
    timestamp: string,
    actor: 'customer' | 'admin' | 'courier' | 'system',
    note: string | null,
    metadata: object | null  // e.g. { awb: string } for pickup events
  }]

TASK 2 — Refund Status Tracking (RET-08, RET-10)
GET /admin/returns/:returnId/refund-status

Fetch refund status from Razorpay API using stored refund_id:
  Response:
  {
    razorpayRefundId: string,
    amount: number,
    status: 'pending' | 'processed' | 'failed',
    initiatedAt: string,
    processedAt: string | null,
    expectedCreditDays: number,
    bankReferenceNumber: string | null
  }

Cache in Redis: refund_status:{returnId} with 5 min TTL
(Razorpay status doesn't change that frequently)

TASK 3 — Replacement Order Link (RET-12)
Update GET /admin/returns/:returnId to include:
  replacementOrder: {
    id: string,
    orderNumber: string,
    status: string,
    createdAt: string
  } | null

Query order table for orders where return_id = this returnId
Include this in the existing return detail response.

CONSTRAINTS:
- Razorpay API key from process.env only (RULE 4)
- Return timeline sorted oldest first
- If Razorpay refund lookup fails: return cached data or
  { status: 'unknown', error: 'Unable to fetch from Razorpay' }
  Do NOT throw 500 — support agent must still see the screen

OUTPUT:
Migration file in full.
All new/modified files listed with changes.
```

---

## STEP 4B — FRONTEND: Return Detail Updates

### Attach These Files
```
RULES.md
SKILLS/frontend-api-skill.md
CDD v1.1
Screen Prompt Pack v1.0 (SCR-29 Return Management, SCR-41 Support Order Detail)
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are updating return management screens for Fabric Speaks.
Follow ALL 6 RULES from RULES.md.
Use CDD v1.1 and Screen Prompt Pack SCR-29, SCR-41 as reference.
Use SKILLS/frontend-api-skill.md for API calls.

SCREENS TO UPDATE:
  apps/web/app/admin/returns/[id]/page.tsx
  apps/web/app/admin/support/[caseId]/page.tsx

CHANGE 1 — Return Timeline Section
Add to both screens below the return status card:

Timeline component (same pattern as order timeline from Step 3):
  Title: "Return Journey"
  Vertical timeline, oldest at bottom (reversed — customer journey flows down)
  Events colour coded:
    RETURN_REQUESTED   → --fs-linen
    PICKUP_SCHEDULED   → --fs-linen
    RETURN_PICKED      → --fs-linen
    RETURN_RECEIVED    → --fs-linen
    REFUND_INITIATED   → #4CAF50 (success green)
    REFUNDED           → #4CAF50
    REPLACEMENT_SENT   → #4CAF50
  Data: GET /admin/returns/:id/timeline

CHANGE 2 — Refund Status Card (RET-08, RET-10)
Add refund status card to return detail (visible to SA + SU):

Card layout:
  Title: "Refund Status"
  Razorpay Refund ID: rfnd_XXXXXXXX [Copy button] ← RET-11
  Amount: ₹1,299
  Status badge: Pending / Processed / Failed
  Initiated: June 3, 2026
  Expected credit: 5-7 business days (show if status = pending)
  Processed on: June 8, 2026 (show if status = processed)
  Bank reference: XXXXXXXX (show if available)

Copy button behaviour (RET-11):
  Copies refund ID to clipboard
  Button label changes to "Copied!" for 2 seconds then reverts
  This is what support agent reads to the customer on call

If refund status fetch fails:
  Show: "Refund status temporarily unavailable. Razorpay Refund ID: [id]"
  Still show the copy button — agent can still give the ID to customer

CHANGE 3 — Replacement Order Link (RET-12)
If return has a replacement order, show card:
  Title: "Replacement Order"
  Order number: #FS-2847 (clickable → /admin/orders/[id])
  Status badge: current order status
  Created: date

If no replacement: do not show the card.

CHANGE 4 — Support Agent View
On SCR-41 (Support Order Detail) add:
  Return status section with timeline (same as above)
  Refund status card (same as above)
  Note: support agent cannot modify — read only
  All action buttons (approve return, schedule pickup) hidden for SU role

CONSTRAINTS:
- Copy to clipboard uses navigator.clipboard.writeText
- Graceful degradation if clipboard API not available (show manual select)
- All refund amounts formatted as ₹X,XXX (Indian number format)
- Role gate: SU sees everything but no action buttons

OUTPUT:
Complete changes for each modified file.
```

---

---

# STEP 5 — ADMIN WHATSAPP NOTIFICATIONS

**Features:** NOT-01, NOT-02, NOT-04, NOT-05, NOT-06  
**Roles affected:** Super Admin, Inventory Manager (stock alerts only)  
**Why now:** Without these, admin is flying blind — no alerts for new orders or returns.  
**HDD reference:** Persona 11 (WhatsApp Cross-cutting)

---

## STEP 5A — BACKEND: Admin Notification Events

### Attach These Files
```
RULES.md
SKILLS/service-skill.md
API Design v1.1 (Notification section)
LLD v1.1 (notification_logs table)
Admin Feature Master List v1.0
```

### Implementation Prompt

```
You are adding admin-facing WhatsApp notifications to the
Fabric Speaks notification-service.
Follow ALL 6 RULES from RULES.md.
Reference API Design v1.1 Notification section.
Reference LLD v1.1 for notification_logs schema.

CONTEXT:
Current notification-service only sends to customers.
Admin needs WhatsApp alerts for operational events.
Admin mobile number stored in store_settings as 'admin_whatsapp'.

TASK 1 — Add admin_whatsapp to store settings
Add new default row to store_settings:
  ('admin_whatsapp', '', 'Admin WhatsApp number for operational alerts')
  ('inventory_manager_whatsapp', '', 'Inventory manager WhatsApp for stock alerts')

TASK 2 — New notification events to handle
Add handlers in notification-service for:

order.placed.cod (NOT-02)
  Trigger: new COD order created
  Recipient: admin (from settings.admin_whatsapp)
  Template: "New COD Order #{orderNumber} for ₹{total} from {customerName}. Mobile: {mobile}. Please confirm delivery feasibility."
  Priority: HIGH (process immediately, not queued delay)

order.placed.paid (NOT-01)
  Trigger: payment captured on new order
  Recipient: admin (from settings.admin_whatsapp)
  Template: "New Order #{orderNumber} ₹{total} received. Payment confirmed. Ready to pack."
  Priority: HIGH

stock.critical (enhance NOT-04)
  Trigger: stock_qty reaches 0
  Recipient: admin + inventory_manager (both numbers)
  Template: "STOCK OUT: {productName} {size} {colour} (SKU: {sku}) is now out of stock."
  Priority: HIGH

stock.low (enhance NOT-05)
  Trigger: stock_qty drops below threshold (from settings)
  Recipient: inventory_manager (not admin — too noisy for admin)
  Template: "Low stock: {productName} {size} {colour} — {qty} units remaining."
  Priority: NORMAL

return.requested (NOT-06)
  Trigger: customer initiates return
  Recipient: admin
  Template: "Return requested for Order #{orderNumber} by {customerName}. Reason: {reason}. Action needed within 24h."
  Priority: HIGH

TASK 3 — Admin notification preferences
Add setting: admin_notification_preferences
  Default: { new_orders: true, cod_orders: true, stock_critical: true,
             stock_low: true, returns: true }
  Admin can toggle each type off in settings page

Before sending any admin notification:
  Check preferences from settings service
  If type is disabled: skip silently (still log to notification_logs)

TASK 4 — Fallback for missing admin number
If admin_whatsapp is empty string:
  Log warning: "Admin WhatsApp not configured — skipping admin notification"
  Do NOT throw error — customer notifications must not be affected

CONSTRAINTS:
- Admin notification failures must NOT affect customer notifications
  Wrap all admin notification sends in isolated try/catch
- All notifications logged to notification_logs even if send fails
- Template IDs stored as constants — not hardcoded strings
- Admin number from settings service — not from env vars

OUTPUT:
List all files modified.
Show new event handlers in full.
Show migration addition for new settings rows.
```

---

### Verify Build Prompt

```
Admin notifications backend was just implemented.
Verify:

STEP 1 — New event handlers registered
  [ ] order.placed.cod handler exists
  [ ] order.placed.paid handler exists
  [ ] stock.critical handler exists (enhanced from stock.low)
  [ ] return.requested handler exists

STEP 2 — Admin number safety check
  [ ] Empty admin_whatsapp logs warning and skips — no error thrown
  [ ] Customer notification path has NO dependency on admin number

STEP 3 — Preference check
  [ ] Each notification type checks preferences before sending
  [ ] Disabled type still logs to notification_logs

STEP 4 — Isolation check
  In notification-service event handlers:
  [ ] Admin notification send is wrapped in its own try/catch
  [ ] Customer notification continues even if admin send fails

STEP 5 — Template constants
  [ ] Template IDs are constants (not inline strings)
  [ ] Template constants file exists and is imported

Report PASS/FAIL with fixes.
```

---

## STEP 5B — FRONTEND: Notification Settings in Admin

### Attach These Files
```
RULES.md
SKILLS/frontend-api-skill.md
CDD v1.1
```

### Implementation Prompt

```
You are adding notification preferences to the Store Settings page
built in Step 2B. This is an addition to an existing screen.

UPDATE: apps/web/app/admin/settings/page.tsx

ADD SECTION 5 — Notifications
Below the existing sections, add:

Title: "Operational Notifications"
Subtitle: "WhatsApp alerts sent to admin and team"

Fields:
  Admin WhatsApp Number    (tel input, India format, required for notifications)
  Inventory Manager WhatsApp (tel input, optional)

Notification toggles (each with label + helper text):
  New paid orders         ON/OFF  "Alert when a paid order is placed"
  New COD orders          ON/OFF  "Alert for COD orders needing confirmation"
  Stock critical (0 units) ON/OFF "Alert when any variant goes out of stock"
  Stock low               ON/OFF "Alert when stock drops below threshold"
  Return requests         ON/OFF "Alert when customer requests a return"

Warning if both numbers are empty:
  "Add WhatsApp numbers above to receive operational alerts"
  (shown as inline warning, not blocking)

Save button for this section same as other sections.

CONSTRAINTS:
- Phone number validation: 10 digits, India format
- No country code field — strip +91 if entered, store as 10 digits
- All toggles default ON (from settings service defaults)
- API: PATCH /admin/settings for each save

OUTPUT:
Show only the changed section of settings/page.tsx.
Show any new sub-components created.
```

---

---

# STEP 6 — PHASE 1 END-TO-END VERIFICATION

**Run this after all Steps 1-5 are complete.**  
**This is a full smoke test of the admin console.**

### Attach These Files
```
RULES.md
Admin Feature Master List v1.0
HDD v1.0 (Persona 4 and Persona 10 acceptance criteria)
```

### Phase 1 Smoke Test Prompt

```
Perform a complete Phase 1 end-to-end verification for the
Fabric Speaks admin console.
Reference: Admin Feature Master List v1.0
Reference: HDD v1.0 Persona 4 and Persona 10

This is not a unit test — this is a manual verification
of complete user flows. Run each flow and report the result.

FLOW 1 — Admin adds a new product with variants
  1. Login as SUPER_ADMIN
  2. Navigate to /admin/products/new
  3. Fill all shared fields including all 6 fabric fields:
     fabric_type, gsm_weight, weave_type, breathability_rating,
     care_instructions, fabric_origin
  4. In variant matrix: add 2 colours (White, Black)
     Select sizes: S, M, L
     Set stock: White-S=50, White-M=30, White-L=20,
                Black-S=40, Black-M=25, Black-L=15
     Upload colour image for each colour
  5. Click Save All
  Expected:
    [ ] Product created with 6 variants
    [ ] All 6 fabric fields saved correctly
    [ ] Colour images uploaded to GCS and URLs stored
    [ ] Product appears in /admin/products list
    [ ] Product appears on storefront /products/:slug
    [ ] Audit log has entry for product creation

FLOW 2 — Admin updates store settings
  1. Navigate to /admin/settings
  2. Update: store_name, gst_number, free_shipping_above = 999
  3. Toggle COD to OFF → confirm modal → save
  4. Check storefront: COD option should not appear in checkout
  5. Toggle COD back ON → save
  6. Check storefront: COD option appears again
  Expected:
    [ ] Settings saved correctly
    [ ] COD toggle affects checkout in real time
    [ ] Audit log has entries for each change

FLOW 3 — Admin processes an order end to end
  1. Place a test order on storefront (COD)
  2. In admin dashboard:
     [ ] COD Pending widget shows +1
     [ ] New COD order WhatsApp notification received (if number configured)
  3. Open order in /admin/orders
  4. View order timeline — PENDING_PAYMENT event shown
  5. Update status to CONFIRMED
     [ ] Timeline shows CONFIRMED event
     [ ] Customer WhatsApp notification sent
  6. Print packing slip
     [ ] Packing slip shows correct items, sizes, colours, address
     [ ] Print dialog opens
  7. Push to Shiprocket
     [ ] AWB number stored on order
     [ ] Dashboard widget count decreases

FLOW 4 — Support agent handles a return call
  1. Login as SUPPORT_AGENT
  2. Customer calls with mobile 9800000001
  3. Navigate to /admin/support/customer/9800000001
     [ ] Customer profile loads
     [ ] All orders visible
  4. Open order with a return
  5. In return detail:
     [ ] Return timeline visible with all events + timestamps
     [ ] Refund status card shows Razorpay refund ID
     [ ] Copy button copies refund ID to clipboard
     [ ] If replacement exists: replacement order card visible
  6. Agent reads refund ID to customer
  7. Verify: no action buttons visible for SUPPORT_AGENT

FLOW 5 — Inventory manager updates stock
  1. Login as INVENTORY_MANAGER
  2. Navigate to /admin/products
  3. Open existing product
  4. In variant matrix: update Black-S stock from 40 to 3
  5. Save
  Expected:
    [ ] Stock updated to 3
    [ ] stock.low WhatsApp notification sent to inventory_manager number
    [ ] Stock health dashboard shows Black-S as Warning

FLOW 6 — Cancel order flow
  1. Login as SUPER_ADMIN
  2. Open a CONFIRMED order
  3. Click Cancel Order
  4. Enter reason: "Customer requested cancellation by phone"
  5. Confirm
  Expected:
    [ ] Order status → CANCELLED
    [ ] Stock released (variants stock_qty incremented back)
    [ ] If paid: refund initiated via Razorpay
    [ ] Cancel event in order timeline
    [ ] Audit log entry for cancellation

VERIFICATION SCORECARD:
Report each flow as PASS / FAIL / PARTIAL
For every FAIL: exact step that failed + error message + fix

PHASE 1 COMPLETE when: all 6 flows PASS
```

---

---

# APPENDIX A — QUICK REFERENCE: RULES.md SUMMARY

Always verify your implementation against these 6 rules:

```
RULE 1: Every async controller function wrapped in try/catch
        Errors passed to next(error) — never swallowed

RULE 2: Zod schema validates input BEFORE any service call
        Invalid input → 400 with field-level error details

RULE 3: All SQL in repository files only
        No db.query() in controllers or services

RULE 4: All secrets from process.env only
        Zero hardcoded credentials, keys, or tokens anywhere

RULE 5: Every response:
        Success: { success: true, data: { ... } }
        Error:   { success: false, errorCode: '', message: '' }

RULE 6: Every admin write appends to audit_log:
        { adminUserId, action, entity, entityId, diff, timestamp }
```

---

# APPENDIX B — DESIGN DOCUMENT REFERENCE MAP

| When building... | Primary doc | Secondary doc |
|-----------------|-------------|---------------|
| New DB table | LLD v1.1 | API Design v1.1 |
| New endpoint | API Design v1.1 | LLD v1.1 |
| New screen | Screen Prompt Pack | CDD v1.1 |
| New component | CDD v1.1 | Screen Prompt Pack |
| Business logic | HDD v1.0 | LLD v1.1 |
| Role permissions | Admin Feature Master List | RULES.md |
| Notifications | API Design v1.1 | HDD Persona 11 |

---

# APPENDIX C — STEP COMPLETION CHECKLIST

Print this and tick off each step:

```
PHASE 1
[ ] Step 1A — Variant Matrix Backend       BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 1B — Variant Matrix Frontend      BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 2A — Store Settings Backend       BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 2B — Store Settings Frontend      BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 3A — Order Operations Backend     BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 3B — Order Operations Frontend    BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 4A — Return Timeline Backend      BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 4B — Return Timeline Frontend     BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 5A — Admin Notifications Backend  BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 5B — Admin Notifications Frontend BUILT / VERIFIED / CROSS-CHECKED
[ ] Step 6  — Phase 1 E2E Smoke Test       ALL 6 FLOWS PASS

PHASE 1 COMPLETE → Begin Phase 2 (Sale Events + Analytics)
```

---

*Feed this document to the agent step by step.*  
*Never give the agent more than one step at a time.*  
*Always run VERIFY BUILD before CROSS-CHECK.*  
*Always run CROSS-CHECK before moving to next step.*
