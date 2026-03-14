<p><strong>FABRIC SPEAKS</strong></p>
<p>High-Level Design Document</p>
<p><em>Master Version — Consolidated (v1.0 to v3.0)</em></p>

<table>
<tr><td><p><strong>Status</strong></p></td><td><p><strong>FINAL MASTER — Source of Truth</strong></p></td></tr>
<tr><td><p><strong>Gaps Resolved</strong></p></td><td><p>106 Total (40 from v1-v2, 66 from journey review)</p></td></tr>
<tr><td><p><strong>Total Services</strong></p></td><td><p>23</p></td></tr>
<tr><td><p><strong>Total DB Entities</strong></p></td><td><p>25</p></td></tr>
</table>

<h1><strong>1. Project Overview</strong></h1>
<p>Fabric Speaks is a mobile-first, fabric-conscious commerce platform for working men (25-40) in India. The design prioritizes information density (weave, GSM, origin) and reliable promises (delivery dates, return policies) to build a trust-based brand identity.</p>

<h1><strong>2. Architecture Principles</strong></h1>

<h2><strong>2.1  Config-First Environment Management</strong></h2>
<p>All environment-specific values live in config files — never hardcoded. A single Config Service merges default + environment-specific config at runtime.</p>
<p>  Environments: development, staging, production.</p>

<h2><strong>2.2  Repository Pattern — DB Vendor Abstraction</strong></h2>
<p>  Service Layer  →  Repository Interface  →  Implementation  →  DB</p>
<p>Switching vendor requires writing a new implementation file and changing a config flag, with zero changes to service logic.</p>

<h2><strong>2.3  Generic Attribute Model</strong></h2>
<p>Product attributes stored as JSON key-value pairs (GIN indexed). Supports adding new categories (Footwear, Beauty) without schema migrations.</p>

<h2><strong>2.4  Async-First Post-Order Processing</strong></h2>
<p>Order placement is synchronous only for critical path: stock reservation + payment capture + order record creation. Everything else (WhatsApp, Shiprocket, etc.) goes to an async job queue (BullMQ).</p>

<h2><strong>2.5  Soft Delete Strategy (Universal)</strong></h2>
<p>No hard deletes on business entities. All mutable tables carry <code>is_deleted</code> and <code>deleted_at</code>. Preserves order history and GST integrity.</p>

<h2><strong>2.6  Collection Rule Evaluation</strong></h2>
<p>Smart Collections define membership via <code>rules_json</code> (whitelist: fabric_type, price, etc.). Rules are evaluated server-side at product save and cached in Redis (1hr TTL). Cache is invalidated on product/collection updates.</p>

<h2><strong>2.7  Sale Price Precedence Rule</strong></h2>
<p>Pricing hierarchy: (1) <code>sale_price</code> (if <code>sale_active</code> is true), (2) <code>price_override</code> (variant-level), (3) <code>base_price</code> (product-level). Calculated server-side.</p>

<h2><strong>2.8  Navigation and Homepage as Config</strong></h2>
<p>Nav structure and homepage layout sections (7) are database-driven and Redis-cached. Admin changes take effect in near real-time without deployments.</p>

<h1><strong>3. System Architecture</strong></h1>
<p>  ┌──────────────────────────────────────────────────────────────────────┐</p>
<p>  │                         CLIENT LAYER                                 │</p>
<p>  │   Customer PWA   Admin Panel   Support Panel   Content Story Pages   │</p>
<p>  │              Next.js (React) — Mobile-First — SSR for SEO           │</p>
<p>  └───────────────────────────────────┬──────────────────────────────────┘</p>
<p>                                      │  HTTPS / REST</p>
<p>  ┌───────────────────────────────────▼──────────────────────────────────┐</p>
<p>  │                          API GATEWAY                                 │</p>
<p>  │  Firebase JWT Auth  │  Rate Limiting  │  Routing  │  CORS           │</p>
<p>  │  WA Webhook Signature Validation  │  Request Logging                 │</p>
<p>  └──┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──────────┘</p>
<p>  Auth Cat  Inv  Ord  Pay  Pin  Notif Coll  Nav  Cont  HPC  Srch  Admin</p>
<p>  Svc  Svc  Svc  Svc  Svc  Svc  Svc   Svc  Svc  Svc   Svc  Svc   Svc</p>
<p>     └──────────────────── REPOSITORY LAYER ──────────────────────────┘</p>
<p>                    DB-Agnostic │ Soft Delete │ Audit Log</p>
<p>                                  ↓</p>
<p>  ┌──────────────────────────────────────────────────────────────────────┐</p>
<p>  │  CLOUD SQL (PostgreSQL) — Primary + Read Replica                    │</p>
<p>  │  25 entities │ GIN index on attributes │ Row-level locks            │</p>
<p>  └──────────────────────────────────────────────────────────────────────┘</p>
<p>  ┌──────────────────────────────────────────────────────────────────────┐</p>
<p>  │  REDIS (Cloud Memorystore)                                          │</p>
<p>  │  OTP 2min │ Pincode 24hr │ Collections 1hr │ Nav until-update       │</p>
<p>  │  Homepage config │ Guest cart 7d │ WA rate limit counter           │</p>
<p>  └──────────────────────────────────────────────────────────────────────┘</p>
<p>  ┌──────────────────────────────────────────────────────────────────────┐</p>
<p>  │  ASYNC JOB QUEUE (BullMQ + Redis)                                   │</p>
<p>  │  Post-order │ Notifications │ Broadcasts │ Back-in-stock            │</p>
<p>  │  Proactive support │ Rate-limit-aware │ Dead-letter queue           │</p>
<p>  └──────────────────────────────────────────────────────────────────────┘</p>

<h1><strong>4. Service Definitions (23 Services)</strong></h1>
<table>
<tr><td><p><strong>Service</strong></p></td><td><p><strong>Responsibility</strong></p></td></tr>
<tr><td><p><strong>1. Auth Service</strong></p></td><td><p>Firebase Auth (OTP/Email/Google). Custom role claims. Consent logging.</p></td></tr>
<tr><td><p><strong>2. Product &amp; Catalog</strong></p></td><td><p>Fabric-first listing. Generic attributes. Sale price logic. Image pipeline.</p></td></tr>
<tr><td><p><strong>3. Inventory Service</strong></p></td><td><p>Variant matrix. Atomic reservation. Stock adjustments log. Arrival planner.</p></td></tr>
<tr><td><p><strong>4. Order Management</strong></p></td><td><p>State machine. COD fraud/blacklist. GST module. Idempotent webhooks.</p></td></tr>
<tr><td><p><strong>5. Payment Service</strong></p></td><td><p>Razorpay wrapper. Failure retry/switch to COD flows. Refund API.</p></td></tr>
<tr><td><p><strong>6. Pincode Utility</strong></p></td><td><p>Shiprocket serviceability/COD check. Redis cached (24hr).</p></td></tr>
<tr><td><p><strong>7. Notification Service</strong></p></td><td><p>WA/SMS/Email/Push. 24hr window tracker. Rate limit fallback.</p></td></tr>
<tr><td><p><strong>8. Collection Service</strong></p></td><td><p>Smart (rule-based) + Manual collections. Redis cached (1hr).</p></td></tr>
<tr><td><p><strong>9. Homepage Config</strong></p></td><td><p>Dynamic control of 7 UI sections via DB config.</p></td></tr>
<tr><td><p><strong>10. Navigation Service</strong></p></td><td><p>DB-driven global/footer/mobile nav items with highlight support.</p></td></tr>
<tr><td><p><strong>11. Return &amp; Replacement</strong></p></td><td><p>Standard return + Fast-track (Wrong/Damaged) path with auto-approval.</p></td></tr>
<tr><td><p><strong>12. Stock Notification</strong></p></td><td><p>Back-in-stock subscriptions and automated WA/Email alerts.</p></td></tr>
<tr><td><p><strong>13. Reviews &amp; Ratings</strong></p></td><td><p>Verified-purchase moderation queue. Fabric tags &amp; photos.</p></td></tr>
<tr><td><p><strong>14. Search &amp; Filter</strong></p></td><td><p>PostgreSQL FTS + GIN search. Fuzzy matching. Category filters.</p></td></tr>
<tr><td><p><strong>15. Wishlist Service</strong></p></td><td><p>Registered (DB) / Guest (Redis). Deactivation notifications.</p></td></tr>
<tr><td><p><strong>16. Banner Service</strong></p></td><td><p>Scheduled promotional banners. M/D variants. UTM tracking.</p></td></tr>
<tr><td><p><strong>17. Content &amp; Page</strong></p></td><td><p>Editorial stories (/stories/*). TipTap rich text. Product linking.</p></td></tr>
<tr><td><p><strong>18. Coupon &amp; Discount</strong></p></td><td><p>Usage limits. Pessimistic locks. Min-order upsells.</p></td></tr>
<tr><td><p><strong>19. Event Tracking</strong></p></td><td><p>Signal capture for recommendation engine (v2 feature).</p></td></tr>
<tr><td><p><strong>20. Admin &amp; Reporting</strong></p></td><td><p>Daily Ops Dashboard. Revenue analytics from read replica.</p></td></tr>
<tr><td><p><strong>21. Broadcast Campaign</strong></p></td><td><p>Targeted WA broadcasts with frequency capping (max 2/week).</p></td></tr>
<tr><td><p><strong>22. Config Service</strong></p></td><td><p>Env-aware loader. Feature flags. Vendor toggle.</p></td></tr>
<tr><td><p><strong>23. Repository Layer</strong></p></td><td><p>DB-agnostic interface. Universal soft-delete filter. Audit logging.</p></td></tr>
</table>

<h1><strong>5. Key Interaction Flows</strong></h1>
<p><strong>5.1 Purchase (Happy Path)</strong>: Sync stock reserve + payment -> Async WA/Email/Shiprocket.</p>
<p><strong>5.2 OTP Edge Cases</strong>: 2min TTL, 3 attempts lockout, resend cooldown (30s).</p>
<p><strong>5.3 Payment Failure</strong>: 15min stock hold, Retry/Switch to COD options.</p>
<p><strong>5.4 COD Confirmation</strong>: 30min cancellation window before AWB creation.</p>
<p><strong>5.5 Return/Replacement</strong>: Partial supported. Standard (Inspection) vs Fast-track (Auto-approve).</p>
<p><strong>5.6 Guest Tracking</strong>: Order ID + Mobile OTP verification. No account needed.</p>
<p><strong>5.7 Variant Matrix</strong>: Admin UI grid for bulk stock/price management.</p>
<p><strong>5.8 Collection Load</strong>: Smart rule evaluation server-side + Redis caching.</p>
<p><strong>5.9 Sale Launch</strong>: Bulk sale variant update -> Smart collection populates -> Banner activates -> WA broadcast.</p>
<p><strong>5.10 Proactive Support</strong>: WA alert on Shiprocket 'Delivery Attempt Failed' within 2hrs.</p>
<p><strong>5.11 Fast-Track Return</strong>: Auto-approve Wrong/Damaged items; dispatch replacement BEFORE pickup.</p>
<p><strong>5.12 Back-in-Stock</strong>: Inventory 0->Positive triggers WA to all subscribers.</p>

<h1><strong>6. Technology Stack</strong></h1>
<p><strong>Frontend</strong>: Next.js (React) PWA, Tailwind CSS, TipTap Editor.</p>
<p><strong>Backend</strong>: Node.js (TypeScript), Express.js.</p>
<p><strong>Data</strong>: Cloud SQL (PostgreSQL) + Read Replica, Redis (Cloud Memorystore).</p>
<p><strong>Queue</strong>: BullMQ + Redis.</p>
<p><strong>Services</strong>: Firebase (Auth/Storage/FCM), Razorpay, Shiprocket, WA Cloud API, MSG91 (SMS), Google Places.</p>

<h1><strong>7. Database Model (25 Entities)</strong></h1>
<p>Users, Products, Variants, Inventory, Orders, Order_Items, Addresses, Product_Attributes, Product_Images, Brands, Categories, Coupons, Banners, Returns, Return_Items, Reviews, Wishlist, Notification_Log, Events, Admin_Audit_Log, <strong>Collections, Collection_Products, Content_Pages, Homepage_Config, Nav_Items, Broadcast_Campaigns, Analytics, Consent_Log, Stock_Notifications, Stock_Adjustments, Expected_Stock.</strong> (Consolidated into unified schema).</p>

<h1><strong>8. Security &amp; Compliance</strong></h1>
<p><strong>WA Security</strong>: 24hr window enforcement. Meta signature validation.</p>
<p><strong>Consent</strong>: Insert-only consent_log for TRAI compliance. Standalone opt-out page.</p>
<p><strong>Integrity</strong>: Soft delete everywhere. Atomic stock locks. HMAC webhook validation.</p>

<h1><strong>9. Panel Inventories</strong></h1>
<p><strong>Admin</strong>: 25 screens including Daily Ops, Collection Manager, and Navigation Manager.</p>
<p><strong>Support</strong>: Mobile-responsive card views for Query Queue and Customer 360 View.</p>
<p><strong>Customer</strong>: 19 screens including Guest Tracking, Story Pages, and Notify Me widgets.</p>

<hr/>
<p><em>End of Master HLD. For full version history (v1-v3), see Appendix in Design Docs folder.</em></p>
