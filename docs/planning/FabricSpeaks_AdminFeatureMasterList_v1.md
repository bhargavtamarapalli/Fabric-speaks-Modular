# Fabric Speaks — Admin Feature Master List & Implementation Plan
**Version:** 1.0 · March 2026  
**Roles covered:** Super Admin · Inventory Manager · Support Agent  
**Purpose:** Complete feature reference for LLM context + implementation roadmap

---

## IMPORTANT — How to Read This Document

Every feature has:
- A role tag: `[SA]` Super Admin · `[IM]` Inventory Manager · `[SU]` Support Agent
- A priority: `P0` Cannot operate without · `P1` Needed within 2 weeks · `P2` Nice to have
- A status: `✅ Built` · `⚠️ Partial` · `❌ Missing`

When feeding this to an LLM agent:
- Attach this document as context
- Tell the agent which Phase you are building
- Agent should only touch features marked for that Phase

---

## PART 1 — COMPLETE MERGED FEATURE LIST

---

### 1.1 CATALOG MANAGEMENT

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| CAT-01 | Create product (all 6 fabric fields mandatory) | SA, IM | P0 | ⚠️ Partial |
| CAT-02 | Edit product shared fields | SA, IM | P0 | ⚠️ Partial |
| CAT-03 | Soft delete product (is_active = false) | SA, IM | P0 | ✅ Built |
| CAT-04 | Variant matrix — create all size/colour in one go | SA, IM | P0 | ❌ Missing |
| CAT-05 | Bulk update variant stock + price + colour image | SA, IM | P0 | ❌ Missing |
| CAT-06 | View product list (filter: brand, category, fabric, status) | SA, IM | P0 | ⚠️ Partial |
| CAT-07 | Product search in admin | SA, IM | P1 | ❌ Missing |
| CAT-08 | Duplicate product (copy all shared fields, change variants) | SA, IM | P1 | ❌ Missing |
| CAT-09 | Create brand | SA, IM | P0 | ✅ Built |
| CAT-10 | Edit brand (name, logo, description) | SA, IM | P0 | ✅ Built |
| CAT-11 | Deactivate brand | SA | P1 | ❌ Missing |
| CAT-12 | View brand list | SA, IM | P0 | ✅ Built |
| CAT-13 | Create category | SA, IM | P0 | ✅ Built |
| CAT-14 | Edit category | SA, IM | P0 | ✅ Built |
| CAT-15 | Nest category under parent (sub-categories) | SA, IM | P1 | ⚠️ Partial |
| CAT-16 | Deactivate category | SA | P1 | ❌ Missing |
| CAT-17 | Create collection | SA, IM | P0 | ✅ Built |
| CAT-18 | Edit collection (name, description, hero image) | SA, IM | P0 | ✅ Built |
| CAT-19 | Add/remove products in collection | SA, IM | P0 | ✅ Built |
| CAT-20 | Reorder products within collection | SA, IM | P1 | ❌ Missing |
| CAT-21 | Publish/unpublish collection | SA, IM | P0 | ❌ Missing |
| CAT-22 | View collection list | SA, IM | P0 | ✅ Built |

---

### 1.2 PRICING & PROMOTIONS

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| PRC-01 | Create coupon (% or flat discount) | SA | P0 | ✅ Built |
| PRC-02 | Set usage limit (total + per user) | SA | P0 | ✅ Built |
| PRC-03 | Set expiry date on coupon | SA | P0 | ✅ Built |
| PRC-04 | Set minimum order value on coupon | SA | P0 | ✅ Built |
| PRC-05 | Activate/deactivate coupon | SA | P0 | ✅ Built |
| PRC-06 | View coupon usage stats (used count, by whom) | SA | P1 | ❌ Missing |
| PRC-07 | View coupon list | SA | P0 | ✅ Built |
| PRC-08 | Sale price toggle per product (compare_price strikethrough) | SA, IM | P0 | ❌ Missing |
| PRC-09 | Bulk price update — % or flat across multiple products | SA | P1 | ❌ Missing |
| PRC-10 | Create sale event (name, start, end, discount, scope) | SA | P1 | ❌ Missing |
| PRC-11 | Apply sale to collection / fabric type / hand-picked products | SA | P1 | ❌ Missing |
| PRC-12 | Preview sale before going live | SA | P1 | ❌ Missing |
| PRC-13 | End sale manually (revert all prices) | SA | P1 | ❌ Missing |
| PRC-14 | Schedule price change (set date + time) | SA | P2 | ❌ Missing |

---

### 1.3 LIVE STORE CONTROLS

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| LSC-01 | Announcement bar — create text + background colour | SA | P1 | ❌ Missing |
| LSC-02 | Announcement bar — toggle live instantly | SA | P1 | ❌ Missing |
| LSC-03 | Announcement bar — countdown timer option | SA | P2 | ❌ Missing |
| LSC-04 | Homepage hero banner — upload sale creative image | SA | P1 | ❌ Missing |
| LSC-05 | Schedule banner (go live date, auto-expire date) | SA | P2 | ❌ Missing |
| LSC-06 | Sale badge on product cards (auto when sale event active) | SA | P1 | ❌ Missing |
| LSC-07 | PDP — original price strikethrough + sale price (auto) | SA | P1 | ❌ Missing |
| LSC-08 | Pause sale button (emergency stop) | SA | P2 | ❌ Missing |
| LSC-09 | Extend sale button (extend active sale by N hours) | SA | P2 | ❌ Missing |
| LSC-10 | Live order counter during sale (refreshes 30s) | SA | P2 | ❌ Missing |
| LSC-11 | COD toggle — global on/off (override per pincode) | SA | P0 | ❌ Missing |
| LSC-12 | Free shipping threshold (configurable ₹ amount) | SA | P0 | ❌ Missing |

---

### 1.4 INVENTORY MANAGEMENT

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| INV-01 | View all stock levels (sortable by stock — lowest first) | SA, IM | P0 | ✅ Built |
| INV-02 | Manual stock adjustment (single variant, with reason) | SA, IM | P0 | ✅ Built |
| INV-03 | Bulk stock adjustment (multiple variants — UI matrix) | SA, IM | P0 | ❌ Missing |
| INV-04 | View stock health dashboard (critical/warning/healthy) | SA, IM | P0 | ✅ Built |
| INV-05 | View expected stock arrivals | SA, IM | P0 | ✅ Built |
| INV-06 | Add expected stock arrival | SA, IM | P0 | ✅ Built |
| INV-07 | Mark expected stock as received | SA, IM | P0 | ✅ Built |
| INV-08 | Stock alert threshold — configurable (default 5) | SA | P1 | ❌ Missing |
| INV-09 | Days of stock remaining per variant (stock ÷ avg daily sales) | SA, IM | P1 | ❌ Missing |
| INV-10 | Restock suggestion list (variants with < 7 days remaining) | SA, IM | P1 | ❌ Missing |
| INV-11 | Dead stock alert (0 sales in last 30 days) | SA, IM | P2 | ❌ Missing |
| INV-12 | Size/colour demand pattern (M+L always first to run out) | SA, IM | P2 | ❌ Missing |
| INV-13 | Velocity report (units sold per day per variant) | SA, IM | P2 | ❌ Missing |
| INV-14 | Quick stock update inline from order list | SA, IM | P1 | ❌ Missing |

---

### 1.5 ORDER MANAGEMENT

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| ORD-01 | View all orders (filter: status, date, payment method) | SA, SU | P0 | ✅ Built |
| ORD-02 | View order detail | SA, SU | P0 | ✅ Built |
| ORD-03 | Update order status manually | SA | P0 | ✅ Built |
| ORD-04 | Push order to Shiprocket (single) | SA | P0 | ✅ Built |
| ORD-05 | Bulk push orders to Shiprocket | SA | P1 | ❌ Missing |
| ORD-06 | Bulk order status update | SA | P1 | ❌ Missing |
| ORD-07 | Cancel order (with reason) | SA | P0 | ❌ Missing |
| ORD-08 | View cancelled orders | SA, SU | P0 | ❌ Missing |
| ORD-09 | Download GST invoice per order | SA | P0 | ⚠️ Partial |
| ORD-10 | Bulk download invoices (date range) | SA | P1 | ❌ Missing |
| ORD-11 | Export orders to CSV (for accounting) | SA | P1 | ❌ Missing |
| ORD-12 | Print packing slip (name, address, items, sizes, colours) | SA | P0 | ❌ Missing |
| ORD-13 | Orders waiting for Shiprocket push — dashboard widget | SA | P0 | ❌ Missing |
| ORD-14 | COD orders pending confirmation — dashboard widget | SA | P0 | ❌ Missing |
| ORD-15 | Failed payments in last 24h — dashboard widget | SA | P1 | ❌ Missing |
| ORD-16 | View order timeline (full status history with timestamps) | SA, SU | P0 | ❌ Missing |

---

### 1.6 RETURNS & REFUNDS

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| RET-01 | View return queue (filter by status) | SA, SU | P0 | ✅ Built |
| RET-02 | View return detail | SA, SU | P0 | ✅ Built |
| RET-03 | Approve return request | SA | P0 | ✅ Built |
| RET-04 | Schedule reverse pickup via Shiprocket | SA | P0 | ✅ Built |
| RET-05 | Mark return as received at warehouse | SA | P0 | ✅ Built |
| RET-06 | Process refund (Razorpay) | SA | P0 | ✅ Built |
| RET-07 | Process replacement (create new order) | SA | P0 | ✅ Built |
| RET-08 | View refund status from Razorpay | SA, SU | P0 | ❌ Missing |
| RET-09 | Return timeline with timestamps | SA, SU | P0 | ❌ Missing |
| RET-10 | Razorpay refund ID visible to support agent | SU | P0 | ❌ Missing |
| RET-11 | One-click copy refund reference number | SU | P1 | ❌ Missing |
| RET-12 | Replacement order status visible in return detail | SA, SU | P0 | ❌ Missing |
| RET-13 | View both original order + replacement in one view | SU | P1 | ❌ Missing |

---

### 1.7 SUPPORT TOOLS

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| SUP-01 | View support queue (filter by status) | SU | P0 | ✅ Built |
| SUP-02 | View support case detail + full order history | SU | P0 | ✅ Built |
| SUP-03 | Update support case status | SU | P0 | ✅ Built |
| SUP-04 | Customer lookup by mobile number | SU | P0 | ✅ Built |
| SUP-05 | Add internal case note (agent only, not customer visible) | SU | P0 | ✅ Built |
| SUP-06 | View internal notes from all agents on same case | SU | P0 | ❌ Missing |
| SUP-07 | Customer WhatsApp message log (all messages sent) | SU | P1 | ❌ Missing |
| SUP-08 | Customer fraud/VIP note on customer profile | SA, SU | P1 | ❌ Missing |
| SUP-09 | View customer order history (all orders, all time) | SU | P0 | ✅ Built |
| SUP-10 | View customer return history | SU | P0 | ⚠️ Partial |
| SUP-11 | Shiprocket pickup failed — alert in support queue | SU | P1 | ❌ Missing |

---

### 1.8 NOTIFICATIONS TO ADMIN

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| NOT-01 | New order placed → WhatsApp to admin | SA | P0 | ❌ Missing |
| NOT-02 | COD order placed → WhatsApp (needs confirmation) | SA | P0 | ❌ Missing |
| NOT-03 | Payment failed → alert admin | SA | P1 | ❌ Missing |
| NOT-04 | Stock critical (0 units) → immediate WhatsApp | SA, IM | P0 | ⚠️ Partial |
| NOT-05 | Stock low (< threshold) → WhatsApp | SA, IM | P0 | ⚠️ Partial |
| NOT-06 | Return requested → WhatsApp to admin | SA | P0 | ❌ Missing |
| NOT-07 | Shiprocket pickup failed → alert admin | SA | P1 | ❌ Missing |
| NOT-08 | Large order placed (above ₹5,000) → alert admin | SA | P2 | ❌ Missing |
| NOT-09 | New admin user created → alert Super Admin | SA | P1 | ❌ Missing |
| NOT-10 | Failed admin login attempts → security alert | SA | P2 | ❌ Missing |

---

### 1.9 CONTENT MANAGEMENT

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| CMS-01 | Edit homepage sections (hero, featured collection) | SA | P0 | ✅ Built |
| CMS-02 | Edit navigation menu (add/remove/reorder links) | SA | P0 | ✅ Built |
| CMS-03 | Create content page (About, FAQ, Shipping Policy) | SA | P0 | ✅ Built |
| CMS-04 | Edit content page | SA | P0 | ✅ Built |
| CMS-05 | Publish/unpublish content page | SA | P0 | ⚠️ Partial |
| CMS-06 | Create story page (fabric origin editorial) | SA | P1 | ✅ Built |
| CMS-07 | Edit story page | SA | P1 | ✅ Built |
| CMS-08 | Preview page before publishing | SA | P1 | ❌ Missing |

---

### 1.10 ANALYTICS & REPORTING

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| ANL-01 | Daily ops dashboard (orders, revenue, low stock, returns) | SA | P0 | ✅ Built |
| ANL-02 | Yesterday vs day before delta % | SA | P1 | ❌ Missing |
| ANL-03 | This week vs last week comparison | SA | P1 | ❌ Missing |
| ANL-04 | Orders over time chart (last 30 days) | SA | P1 | ❌ Missing |
| ANL-05 | Revenue over time chart (last 30 days) | SA | P1 | ❌ Missing |
| ANL-06 | Top 5 products by units sold | SA | P1 | ❌ Missing |
| ANL-07 | Top 5 fabrics by units sold (USP metric) | SA | P1 | ❌ Missing |
| ANL-08 | Coupon usage report | SA | P2 | ❌ Missing |
| ANL-09 | Return rate by product | SA | P2 | ❌ Missing |
| ANL-10 | Sale performance report (end of sale summary) | SA | P2 | ❌ Missing |
| ANL-11 | WhatsApp blast — estimate reach before sending | SA | P2 | ❌ Missing |

---

### 1.11 CUSTOMER COMMUNICATIONS

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| COM-01 | WhatsApp blast to customer segment | SA | P2 | ❌ Missing |
| COM-02 | Segment by fabric preference (from order history) | SA | P2 | ❌ Missing |
| COM-03 | Schedule blast time (not 2am — set delivery window) | SA | P2 | ❌ Missing |
| COM-04 | Preview WhatsApp message before sending | SA | P2 | ❌ Missing |
| COM-05 | View WhatsApp template list + approval status | SA | P1 | ❌ Missing |

---

### 1.12 ACCESS CONTROL & SETTINGS

| # | Feature | Roles | Priority | Status |
|---|---------|-------|----------|--------|
| ACC-01 | Create admin user | SA | P0 | ✅ Built |
| ACC-02 | Assign role (SA / IM / SU) | SA | P0 | ✅ Built |
| ACC-03 | Deactivate admin user | SA | P0 | ✅ Built |
| ACC-04 | View admin user list | SA | P0 | ✅ Built |
| ACC-05 | View audit log (all admin actions, filterable) | SA | P0 | ✅ Built |
| ACC-06 | Reset admin user session (force logout) | SA | P2 | ❌ Missing |
| SET-01 | Store name + contact details | SA | P0 | ❌ Missing |
| SET-02 | GST number configuration | SA | P0 | ❌ Missing |
| SET-03 | Free shipping threshold (configurable ₹ amount) | SA | P0 | ❌ Missing |
| SET-04 | COD toggle global (on/off) | SA | P0 | ❌ Missing |
| SET-05 | Stock alert threshold (configurable — default 5) | SA | P1 | ❌ Missing |
| SET-06 | WhatsApp notification preferences | SA | P1 | ❌ Missing |

---

## PART 2 — FEATURE COUNT SUMMARY

| Category | Total | ✅ Built | ⚠️ Partial | ❌ Missing |
|----------|-------|----------|------------|------------|
| Catalog Management | 22 | 10 | 3 | 9 |
| Pricing & Promotions | 14 | 5 | 0 | 9 |
| Live Store Controls | 12 | 0 | 0 | 12 |
| Inventory Management | 14 | 7 | 0 | 7 |
| Order Management | 16 | 5 | 1 | 10 |
| Returns & Refunds | 13 | 7 | 0 | 6 |
| Support Tools | 11 | 6 | 1 | 4 |
| Admin Notifications | 10 | 0 | 2 | 8 |
| Content Management | 8 | 5 | 1 | 2 |
| Analytics & Reporting | 11 | 1 | 0 | 10 |
| Customer Communications | 5 | 0 | 0 | 5 |
| Access Control & Settings | 12 | 5 | 0 | 7 |
| **TOTAL** | **148** | **51** | **8** | **89** |

---

## PART 3 — IMPLEMENTATION PLAN

### Guiding Principle
> Build in the order an admin actually uses the system on day one.
> You cannot process orders until products exist.
> You cannot support customers until orders exist.
> You cannot run a sale until the store is operational.

---

### PHASE 1 — Store Can Open (P0 blockers only)
**Goal:** Admin can add products, receive orders, process them, handle returns.  
**Duration:** 2–3 weeks  
**Who benefits:** Super Admin + Inventory Manager from day one

```
WEEK 1A — Catalog Foundation
  CAT-01  Create product with variant matrix (delta doc already written)
  CAT-04  Variant matrix UI (delta doc already written)
  CAT-05  Bulk variant update (delta doc already written)
  CAT-21  Publish/unpublish collection
  PRC-08  Sale price toggle (compare_price) per product
  SET-01  Store settings page (name, GST, contact)
  SET-02  GST number
  SET-03  Free shipping threshold
  SET-04  COD global toggle

WEEK 1B — Order Operations
  ORD-07  Cancel order with reason
  ORD-08  View cancelled orders
  ORD-09  GST invoice download (complete partial)
  ORD-12  Print packing slip
  ORD-13  Dashboard widget — orders waiting for Shiprocket
  ORD-14  Dashboard widget — COD orders pending
  ORD-16  Order timeline with timestamps

WEEK 1C — Returns & Refunds (Support Ready)
  RET-08  Refund status from Razorpay
  RET-09  Return timeline with timestamps
  RET-10  Razorpay refund ID visible to support
  RET-12  Replacement order status in return detail

WEEK 1D — Admin Notifications (Critical)
  NOT-01  New order → WhatsApp to admin
  NOT-02  COD order → WhatsApp to admin
  NOT-04  Stock critical → WhatsApp (fix partial)
  NOT-05  Stock low → WhatsApp (fix partial)
  NOT-06  Return requested → WhatsApp to admin
```

**Phase 1 exit criteria:**
Admin can add a product with variants, receive an order, push to Shiprocket, handle a return end to end, and get WhatsApp alerts for critical events.

---

### PHASE 2 — Store Can Grow (P1 features)
**Goal:** Admin can run promotions, monitor performance, manage efficiently.  
**Duration:** 2–3 weeks  
**Who benefits:** Super Admin primarily

```
WEEK 2A — Promotions & Live Controls
  LSC-01  Announcement bar create
  LSC-02  Announcement bar live toggle
  LSC-04  Homepage hero banner upload
  LSC-06  Sale badge on product cards (auto)
  LSC-07  PDP strikethrough price (auto)
  PRC-10  Create sale event
  PRC-11  Apply sale to collection/fabric/products
  PRC-12  Preview sale before going live
  PRC-13  End sale manually

WEEK 2B — Operations Efficiency
  ORD-05  Bulk push to Shiprocket
  ORD-06  Bulk order status update
  ORD-11  Export orders to CSV
  CAT-07  Product search in admin
  CAT-08  Duplicate product feature
  INV-08  Stock alert threshold configurable
  INV-09  Days of stock remaining per variant
  INV-10  Restock suggestion list

WEEK 2C — Analytics Foundation
  ANL-02  Yesterday vs day before delta
  ANL-03  This week vs last week
  ANL-04  Orders over time chart (30 days)
  ANL-05  Revenue over time chart (30 days)
  ANL-06  Top 5 products by units sold
  ANL-07  Top 5 fabrics by units sold (USP metric)

WEEK 2D — Support Enhancements
  SUP-06  Internal notes visible to all agents
  SUP-07  Customer WhatsApp message log
  SUP-08  Customer fraud/VIP note
  RET-11  One-click copy refund reference
  NOT-09  New admin user created → alert Super Admin
  SET-05  Stock alert threshold config
  SET-06  WhatsApp notification preferences
```

**Phase 2 exit criteria:**
Admin can run a sale event end to end, monitor it live, see what's selling, and make restock decisions based on data.

---

### PHASE 3 — Store Can Scale (P2 features)
**Goal:** Advanced automation, deep analytics, customer communications.  
**Duration:** 3–4 weeks  
**Build after first 100 orders — you need real data for most of these**

```
WEEK 3A — Advanced Promotions
  LSC-03  Countdown timer on announcement bar
  LSC-05  Schedule banner with auto-expire
  LSC-08  Pause sale button
  LSC-09  Extend sale button
  LSC-10  Live sale monitor
  PRC-09  Bulk price update across products
  PRC-14  Schedule price change

WEEK 3B — Advanced Analytics
  ANL-08  Coupon usage report
  ANL-09  Return rate by product
  ANL-10  Sale performance report
  INV-11  Dead stock alert
  INV-12  Size/colour demand pattern
  INV-13  Velocity report (units/day per variant)

WEEK 3C — Customer Communications
  COM-01  WhatsApp blast to segment
  COM-02  Segment by fabric preference
  COM-03  Schedule blast time
  COM-04  Preview message before sending
  COM-05  WhatsApp template list + approval status
  ANL-11  Estimate blast reach

WEEK 3D — Security & Polish
  NOT-08  Large order alert (above ₹5,000)
  NOT-10  Failed admin login security alert
  ACC-06  Reset admin session
  CMS-08  Preview page before publishing
  RET-13  Original + replacement in one view
  NOT-07  Shiprocket pickup failed alert
  NOT-03  Payment failed alert
```

---

## PART 4 — ROLE ACCESS MATRIX

| Feature Category | Super Admin | Inventory Manager | Support Agent |
|-----------------|-------------|-------------------|---------------|
| Catalog — read | ✅ | ✅ | ❌ |
| Catalog — write | ✅ | ✅ | ❌ |
| Pricing & Promotions | ✅ | ❌ | ❌ |
| Live Store Controls | ✅ | ❌ | ❌ |
| Inventory — read | ✅ | ✅ | ❌ |
| Inventory — write | ✅ | ✅ | ❌ |
| Orders — read | ✅ | ✅ (read only) | ✅ (read only) |
| Orders — write | ✅ | ❌ | ❌ |
| Returns — read | ✅ | ❌ | ✅ |
| Returns — write | ✅ | ❌ | ❌ |
| Refund/Replacement | ✅ | ❌ | ❌ |
| Refund status view | ✅ | ❌ | ✅ |
| Support queue | ✅ | ❌ | ✅ |
| Customer lookup | ✅ | ❌ | ✅ |
| Internal notes | ✅ | ❌ | ✅ |
| Content Management | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ (inventory only) | ❌ |
| Admin notifications | ✅ | ✅ (stock only) | ❌ |
| Access Control | ✅ | ❌ | ❌ |
| Store Settings | ✅ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |

---

## PART 5 — WHAT TO BUILD NEXT

Based on the plan above, the immediate next steps in order are:

```
STEP 1  (In progress)
  Bulk variant update delta — already written
  Build CAT-04 + CAT-05 variant matrix

STEP 2  (This week)
  SET-01 through SET-04 — Store settings page
  This unblocks: GST invoices, COD toggle, free shipping logic

STEP 3  (This week)
  ORD-12 Print packing slip
  ORD-13 + ORD-14 Dashboard widgets
  ORD-16 Order timeline

STEP 4  (Next week)
  RET-08 + RET-09 + RET-10 + RET-12
  Return + refund timeline for support agents

STEP 5  (Next week)
  NOT-01 + NOT-02 + NOT-06
  Admin WhatsApp notifications for orders + returns

STEP 6  (After above complete)
  Start Phase 2 — sale event + announcement bar
```

---

*Feed this document to the LLM agent as project context.*  
*Always specify which STEP or PHASE the agent should work on.*  
*Agent should not touch features outside the specified scope.*
