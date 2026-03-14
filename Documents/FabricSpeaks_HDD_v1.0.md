
FABRIC SPEAKS
Hypothesis-Driven Design
v1.0  ·  Foundation Document  ·  March 2026
11 personas  ·  H-A-R-M-T framework  ·  Measurable outcomes per hypothesis


# 1.  Purpose & Framework

This document captures the foundational product thinking behind Fabric Speaks before a single line of code is written. It answers one question per persona: what are we betting on, and how will we know if we are right?

Every design decision, every engineering trade-off, and every priority call in the build should trace back to a hypothesis in this document. If a feature does not serve a hypothesis, it does not belong in the MVP.

## 1.1  The H-A-R-M-T Framework

Each persona is analysed using five lenses:

| Letter | Stands for | What it answers |
| --- | --- | --- |
| H | Hypothesis | The single bet we are placing on this persona's behaviour |
| A | Assumptions | The beliefs that must be true for the hypothesis to hold |
| R | Risks | What breaks if any assumption is wrong — and what we do next |
| M | Metrics | The numbers that prove or disprove the hypothesis post-launch |
| T | Test | The smallest thing to build to validate before over-investing |


## 1.2  Priority Tiers

| Tier | Meaning |
| --- | --- |
| P0 — Highest Risk | Existential. If wrong, the business model itself changes. Validate first. |
| P1 — Medium Risk | Important but recoverable if wrong. Validate in parallel with the build. |
| P2 — Lower Risk | Affects quality and retention, not core viability. Monitor post-launch. |
| Cross-cutting | Platform-wide bet. Runs across all personas. Not tied to one journey. |



# 2.  Product Context — Decisions Locked Before HDD

These decisions were made and agreed before writing a single hypothesis. They constrain and inform every bet in Section 4.

| Category | Decision | Rationale |
| --- | --- | --- |
| Brand name | Fabric Speaks | Fabric-first identity — discovery organised by material, not brand name |
| Business model | Multi-brand curator → own brand (future) | Aggregate external brands at launch. Transition to original designs post-traction. |
| Market | India only | Payments, logistics, and compliance all India-specific for MVP |
| Target customer | Working men, age 25–40 | Quality-conscious, mobile-heavy, value fabric over fast fashion |
| Authentication | OTP (primary) + Email (secondary) | OTP is the dominant pattern for Indian mobile commerce |
| Payments | Razorpay — UPI, Cards, Netbanking + COD | COD is 30–50% of orders in Tier 2/3 India. Cannot be skipped. |
| Logistics | Shiprocket — forward + reverse pickup | Reverse pickup for returns with real-time tracking API |
| WhatsApp | Two-way Business API | Order updates + return initiation — not just one-way notifications |
| Mobile strategy | PWA (Progressive Web App) | App-like experience without App Store friction at MVP stage |
| Images | CDN + WebP + Lazy loading | Clothing is image-heavy. Performance is non-negotiable from day one. |
| Admin roles | Super Admin + Inventory Manager + Support Agent | Multi-role from day one — cheaper to build now than retrofit later |
| Returns | Reverse pickup → inspect → refund or replacement | Both refund and replacement supported from MVP launch |
| Catalog scope | ~5 SKUs, bulk variant update via CSV | Fabric × Brand × Size × Colour variant matrix with bulk upload |
| Reviews + Wishlist | Both in MVP | Wishlist = soft commitment for browsers. Reviews = trust for fabric buyers. |
| Size guide | Inline modal on PDP | Clothing-specific — 30–40% of returns are size-related |
| Deal hunter | Coupon codes + launch offer banner | First-purchase trigger only. Premium positioning must not be diluted. |



# 3.  Persona Register

11 personas confirmed for Fabric Speaks MVP. Ordered by risk to the business model.

| # | Persona | Priority | Why This Persona Matters |
| --- | --- | --- | --- |
| 1 | Intent Buyer (Working Man, 25–40) | P0 | If he does not buy, there is no business |
| 2 | Mobile-First User | P0 | 70%+ of sessions will be mobile. Failure here is failure everywhere. |
| 3 | Guest Checkout User | P0 | Forced account creation kills first purchases on unknown platforms |
| 4 | Brand Admin (Super Admin) | P0 | If admin cannot manage the store, the customer experience breaks |
| 5 | Deal Hunter | P1 | Launch offers trigger first purchase — but must not define the brand |
| 6 | Casual Browser | P1 | Social discovery. Wishlist is the soft conversion goal. |
| 7 | Size-Confused Shopper | P1 | 30–40% of online clothing returns are size-related. Design for confidence. |
| 8 | Loyal Returning Customer | P1 | 60-day repurchase via WhatsApp fabric-match re-engagement |
| 9 | Inventory Manager | P1 | Bulk variant update — 5 fabrics × sizes × colours = 100+ rows |
| 10 | Support Agent | P2 | WhatsApp self-serve deflects 60% of queries. One agent for 6 months. |
| 11 | WhatsApp Notification Touchpoint | Cross | Platform bet across all post-purchase moments — not one persona |



# 4.  Hypothesis-Driven Design — All 11 Personas

Each block follows H-A-R-M-T. The T row is the most important — it tells you what to build first to validate each bet.

| P0 — Highest Risk<br>If any P0 hypothesis is wrong, the business model itself changes. Validate these first. |
| --- |


| 1 | Intent Buyer — Working Man, 25–40 | P0 |
| --- | --- | --- |
| The core revenue persona. If this hypothesis is wrong, the entire business model fails. | The core revenue persona. If this hypothesis is wrong, the entire business model fails. | The core revenue persona. If this hypothesis is wrong, the entire business model fails. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe working men aged 25–40 will choose Fabric Speaks over Myntra or Ajio because they prioritise fabric quality and material information over brand name or price alone. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  Working men in this age group are fabric-conscious, not just brand-conscious<br>2.  They feel current platforms like Myntra and Ajio don't give enough fabric detail at the discovery stage<br>3.  They are willing to try a new platform if fabric information is clearly and prominently presented<br>4.  They complete purchases on mobile during commute or lunch breaks — short, decisive sessions |
| R | RISKS — if any assumption is wrong<br>1.  If fabric-first USP doesn't resonate → Fabric Speaks becomes just another clothing site competing on price and losing to Myntra<br>2.  If they shop by brand, not fabric → the entire catalog organisation is wrong from day one<br>3.  If they abandon mobile mid-session → PWA investment is wasted, need desktop-first redesign |
| M | METRICS — how we know if we are right<br>1.  Fabric filter usage rate > 40% of all sessions<br>2.  Product page time spent > 90 seconds (indicates reading fabric details, not just glancing at the image)<br>3.  Search queries containing fabric terms — linen, cotton, breathable — > 30% of all searches<br>4.  Add-to-cart rate from the fabric detail section > 15%<br>5.  Bounce rate vs Myntra benchmark < 60% |
| T | TEST — smallest thing to build to validate first<br>1.  Launch with 5 products, each with rich fabric detail: weight in GSM, weave type, breathability rating, care instructions, origin<br>2.  A/B test — product card showing FABRIC NAME prominently vs BRAND NAME prominently — track add-to-cart rate<br>3.  Heatmap on PDP to see if the fabric section is read before or after the price<br>4.  Week 1 key question: do users click the Fabric Details section at all? |


| 2 | Mobile-First User | P0 |
| --- | --- | --- |
| 70%+ of traffic will be mobile. If the experience fails here, nothing else matters. | 70%+ of traffic will be mobile. If the experience fails here, nothing else matters. | 70%+ of traffic will be mobile. If the experience fails here, nothing else matters. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe working men 25–40 will complete the full purchase journey — discover, evaluate, and checkout — on mobile without dropping off, if the experience is fast (under 3 seconds) and checkout is under 4 steps. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  Users will not switch to desktop to complete a purchase they started on mobile<br>2.  OTP-based login on mobile is frictionless enough not to cause drop-off<br>3.  Fabric images on a small screen are still convincing enough to purchase without seeing the product physically<br>4.  COD selection on mobile reduces payment anxiety enough to complete the checkout |
| R | RISKS — if any assumption is wrong<br>1.  If mobile checkout abandonment is high → need saved-card and UPI autopay — a more complex payment flow<br>2.  If images aren't convincing on mobile → need 360-degree view or fabric video — scope creep for MVP<br>3.  If OTP causes drop-off → need social login via Google — additional engineering effort |
| M | METRICS — how we know if we are right<br>1.  Mobile vs Desktop session split — expect 70/30 by end of Month 1<br>2.  Mobile checkout completion rate > 55%<br>3.  Page load time on a 4G connection < 3 seconds — Core Web Vitals: LCP, CLS, FID<br>4.  OTP completion rate > 85% — if lower, the login step is the drop-off point<br>5.  Mobile add-to-cart to checkout start conversion rate > 35% |
| T | TEST — smallest thing to build to validate first<br>1.  Build PWA with offline product browsing using a service worker for catalog pages<br>2.  Google Lighthouse target score > 85 before launch<br>3.  Test on a mid-range Android device — Redmi or Realme — which is the target demographic's likely device<br>4.  Track the exact step where mobile users drop off in the 4-step checkout funnel |


| 3 | Guest Checkout User | P0 |
| --- | --- | --- |
| Every forced account creation is a lost sale. First-time buyers on unknown platforms resist commitment. | Every forced account creation is a lost sale. First-time buyers on unknown platforms resist commitment. | Every forced account creation is a lost sale. First-time buyers on unknown platforms resist commitment. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe that offering guest checkout via OTP will increase checkout completion by 25% compared to forcing account creation, because first-time buyers on a new platform resist commitment before trust is established. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  First-time visitors to Fabric Speaks have zero brand trust — they will not create an account before buying<br>2.  OTP on mobile number is enough identity verification for COD orders without full account creation<br>3.  A meaningful percentage of guest users will convert to registered users when shown order tracking benefits post-purchase<br>4.  Guest checkout data — mobile number and address — is sufficient for Shiprocket to process and dispatch the order |
| R | RISKS — if any assumption is wrong<br>1.  If COD fraud is high from guest checkouts → need additional verification like photo ID or OTP-plus check<br>2.  If guests don't convert to registered users → repeat purchases require re-entering all details — friction on every second order<br>3.  If mobile number alone isn't enough for GST invoice → must collect email at guest checkout as mandatory |
| M | METRICS — how we know if we are right<br>1.  Guest vs Registered checkout split — hypothesis: 60% guest in first 3 months<br>2.  Guest checkout completion rate vs registered users — expect guest to be 15–20% higher<br>3.  Guest-to-registered conversion post-purchase > 20% via a Save your details prompt<br>4.  COD order fraud and cancellation rate < 5% — if higher, guest COD checkout needs tightening |
| T | TEST — smallest thing to build to validate first<br>1.  Build both flows, show guest option prominently — never hidden or de-emphasised behind account creation<br>2.  Post-order prompt: Track your order faster — create account — with one-click sign-up and all data pre-filled from the order<br>3.  Week 2 measurement: which flow has lower abandonment — guest or registered? |


| 4 | Brand Admin — Super Admin | P0 |
| --- | --- | --- |
| If admin cannot manage the store efficiently, the customer experience breaks behind the scenes. | If admin cannot manage the store efficiently, the customer experience breaks behind the scenes. | If admin cannot manage the store efficiently, the customer experience breaks behind the scenes. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe a single admin panel with product management, order management, and basic analytics will be sufficient for operating Fabric Speaks for the first 6 months without requiring additional tooling. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  One super admin can manage 5 SKUs plus incoming orders without hitting workflow bottlenecks<br>2.  Bulk variant update — size and colour per fabric — reduces catalog management time by 60% vs individual updates<br>3.  Admin needs mobile access to the dashboard to check and process orders on the go<br>4.  Basic analytics showing orders, revenue, and top products in admin is sufficient — no separate BI tool needed at MVP |
| R | RISKS — if any assumption is wrong<br>1.  If order volume grows faster than expected → single admin becomes a bottleneck → role delegation needed immediately<br>2.  If bulk update doesn't cover all variant scenarios → catalog errors, wrong stock counts, wrong pricing in production<br>3.  If admin panel is not mobile-friendly → cannot respond to orders or critical issues in real time |
| M | METRICS — how we know if we are right<br>1.  Time to add a new product with all variants < 10 minutes end to end<br>2.  Time to process an order from confirmed to shipped < 5 minutes<br>3.  Admin error rate on orders < 2% — wrong item shipped or wrong address confirmed<br>4.  Admin panel page load time < 2 seconds on a mobile device |
| T | TEST — smallest thing to build to validate first<br>1.  Build admin with bulk variant upload using a CSV template with sample data pre-filled<br>2.  Time yourself: complete a full product add with 5 sizes and 3 colour variants — beat 10 minutes<br>3.  Simulate 20 orders arriving in one day — can one person manage all without missing any? |




| P1 — Medium Risk<br>Important but recoverable if wrong. Validate in parallel with the build. |
| --- |


| 5 | Deal Hunter | P1 |
| --- | --- | --- |
| A launch offer triggers the first purchase. But fabric quality must be the reason they return. | A launch offer triggers the first purchase. But fabric quality must be the reason they return. | A launch offer triggers the first purchase. But fabric quality must be the reason they return. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe working men 25–40 will respond to a launch coupon as a first-purchase trigger, but fabric quality must remain the primary reason they stay and come back. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  A launch discount of 10–15% removes first-purchase hesitation on a new, unknown platform<br>2.  Deal hunters who buy only on discount will not be loyal customers — and that is acceptable at this stage<br>3.  Coupon visibility via a homepage banner and a checkout field is sufficient for MVP — no dedicated sale section needed<br>4.  Discounting 5 SKUs at launch will not permanently damage the premium fabric positioning |
| R | RISKS — if any assumption is wrong<br>1.  If brand is perceived as discount-first → premium fabric positioning is permanently damaged and very hard to recover<br>2.  If coupon abuse is high via multiple accounts → need rate limiting and one-per-user enforcement from day one |
| M | METRICS — how we know if we are right<br>1.  Coupon redemption rate > 20% of first orders — validates the offer is visible and effective<br>2.  Repeat purchase rate of coupon users vs non-coupon users — if coupon users never return, hypothesis 2 is confirmed<br>3.  Average order value of coupon vs non-coupon users — ensure discounting is not destroying margins |
| T | TEST — smallest thing to build to validate first<br>1.  One launch coupon code: FABRICFIRST — 10% off first order only<br>2.  Show banner on homepage and cart page only — not on PDP or category pages<br>3.  Track week by week: do coupon users come back, or are they one-and-done? |


| 6 | Casual Browser | P1 |
| --- | --- | --- |
| Social discovery traffic. The goal is not immediate purchase — it is a wishlist add as soft commitment. | Social discovery traffic. The goal is not immediate purchase — it is a wishlist add as soft commitment. | Social discovery traffic. The goal is not immediate purchase — it is a wishlist add as soft commitment. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe casual browsers who discover Fabric Speaks via social media will spend over 2 minutes on site if the fabric storytelling through imagery and copy is strong, and 15% will add to wishlist for a future purchase. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  Instagram and social media is the primary discovery channel for the 25–40 working men demographic<br>2.  Fabric-focused visual content — texture closeups, drape shots, fabric origin stories — holds attention longer than standard product photos<br>3.  Wishlist acts as a soft commitment — reduces immediate bounce without requiring purchase intent |
| R | RISKS — if any assumption is wrong<br>1.  If social traffic doesn't convert to even a wishlist add → top of funnel is broken, paid and SEO strategy needs rethinking<br>2.  If imagery is not compelling enough on mobile → photography and content strategy needs immediate revision before any marketing spend |
| M | METRICS — how we know if we are right<br>1.  Average session duration for new visitors > 2 minutes<br>2.  Pages per session > 3 for social referral traffic<br>3.  Wishlist add rate > 15% of product page visitors<br>4.  Social referral traffic > 40% of total traffic in Month 1<br>5.  Return visitor rate > 20% by Month 2 |
| T | TEST — smallest thing to build to validate first<br>1.  Hero section test: fabric texture video autoplay muted vs static product image — which holds attention longer?<br>2.  Show a Save for later wishlist prompt after 60 seconds on site for non-logged-in users<br>3.  Track: do wishlist items convert to purchases within 30 days? |


| 7 | Size-Confused Shopper | P1 |
| --- | --- | --- |
| Online clothing returns are 30–40%. Most are size-related. This must be designed for from day one. | Online clothing returns are 30–40%. Most are size-related. This must be designed for from day one. | Online clothing returns are 30–40%. Most are size-related. This must be designed for from day one. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe providing an inline size guide with body measurement instructions — not just S/M/L labels — will reduce size-related returns by 30% compared to the online clothing industry average. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  Working men 25–40 don't know their measurements in cm — they only know S/M/L or chest size in inches<br>2.  Size confusion is a top-3 reason for returns in this category and price segment<br>3.  A simple measurement guide covering chest, shoulder, and length with a how-to-measure illustration is sufficient<br>4.  A fabric-specific sizing note such as linen runs slightly large — size down adds enough confidence to reduce hesitation |
| R | RISKS — if any assumption is wrong<br>1.  If returns remain high despite the size guide → need virtual try-on or more detailed fit notes — expensive and post-MVP<br>2.  If size guide is ignored entirely → users trust their usual label → guide adds no value → deprioritise in next iteration |
| M | METRICS — how we know if we are right<br>1.  Size guide interaction rate > 35% of product page visits<br>2.  Size-related return rate < 15% — industry average is 25–30% for online clothing<br>3.  Size guide viewed to add-to-cart conversion > 40% — indicates that confidence was gained |
| T | TEST — smallest thing to build to validate first<br>1.  Size guide as a modal — tap the Size Guide link below the size selector on the PDP<br>2.  Include a measurement table, a how-to-measure illustration, and a fabric-specific note per product<br>3.  Track: do users who view the size guide return the item less often than those who do not? |


| 8 | Loyal Returning Customer | P1 |
| --- | --- | --- |
| Retention is cheaper than acquisition. WhatsApp re-engagement on fabric preference is the lever. | Retention is cheaper than acquisition. WhatsApp re-engagement on fabric preference is the lever. | Retention is cheaper than acquisition. WhatsApp re-engagement on fabric preference is the lever. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe a returning customer will repurchase within 60 days if they receive a personalised WhatsApp message based on their fabric preference from their first order, triggered by a new arrival in that fabric. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  First-order fabric preference is a reliable enough signal for early personalisation<br>2.  WhatsApp re-engagement outperforms email for working men 25–40 in the Indian market<br>3.  Order history and a saved address alone are sufficient loyalty features for MVP — no points system needed yet<br>4.  A 60-day repurchase window is realistic for clothing in the INR 800 to 2500 price segment |
| R | RISKS — if any assumption is wrong<br>1.  If WhatsApp messages feel spammy → users block the business number → the channel is permanently lost<br>2.  If fabric preference from one order isn't reliable → wrong personalisation feels irrelevant → worse than no personalisation |
| M | METRICS — how we know if we are right<br>1.  60-day repurchase rate > 25%<br>2.  WhatsApp message open rate > 60% — WhatsApp average is 85%, below 60% means a content problem<br>3.  WhatsApp to site click-through rate > 30%<br>4.  Unsubscribe or block rate < 3% — if higher, messaging frequency or tone is wrong |
| T | TEST — smallest thing to build to validate first<br>1.  Day 7 post-delivery: How is your fabric shirt — a feedback prompt with a 5-star tap<br>2.  Day 30: New fabric arrivals made for you — with 2 to 3 product links matching their first purchase fabric<br>3.  Day 45: Your size is running low in this product — a scarcity nudge<br>4.  Track which message in the sequence drives the highest return visit and eventual repurchase |


| 9 | Inventory Manager | P1 |
| --- | --- | --- |
| 5 fabrics × sizes × colours = 100+ variant rows. Bulk update is not a nice-to-have — it is the job. | 5 fabrics × sizes × colours = 100+ variant rows. Bulk update is not a nice-to-have — it is the job. | 5 fabrics × sizes × colours = 100+ variant rows. Bulk update is not a nice-to-have — it is the job. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe a CSV-based bulk upload for product variants — fabric, size, colour, price, and stock — will allow the inventory manager to update the full catalog of 5 SKUs with all variants in under 15 minutes. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  The inventory manager is comfortable with basic CSV and Excel operations<br>2.  5 SKUs with multiple variants can be expressed cleanly in a flat CSV row-per-variant structure<br>3.  Validation errors in bulk upload are clearly communicated — which row, which field, and what the fix is<br>4.  A stock alert threshold — for example fewer than 5 units — triggers an automatic WhatsApp or email to admin |
| R | RISKS — if any assumption is wrong<br>1.  If CSV errors are frequent and unclear → inventory manager reverts to manual entry → bulk upload is never used<br>2.  If variant combinations explode — 5 fabrics × 5 sizes × 4 colours = 100 rows — CSV becomes unmanageable and a smarter matrix UI is needed |
| M | METRICS — how we know if we are right<br>1.  Bulk upload success rate > 90% on the first attempt without needing to fix and re-upload<br>2.  Time to update the full catalog < 15 minutes end to end<br>3.  Manual entry fallback rate < 10% — if higher, bulk upload UX needs improvement<br>4.  Stock alert trigger accuracy: 100% — zero missed low-stock events |
| T | TEST — smallest thing to build to validate first<br>1.  Design the CSV template with sample data already filled in — one row per variant<br>2.  Have a non-technical person attempt a complete bulk upload from scratch — count errors, time taken, and retries<br>3.  Simulate stock dropping below the threshold — does the alert fire correctly within 5 minutes? |




| P2 — Lower Risk<br>Affects quality and retention. Not core viability. Monitor post-launch. |
| --- |


| 10 | Support Agent | P2 |
| --- | --- | --- |
| WhatsApp self-serve deflects 60% of queries. One agent should handle the rest for the first 6 months. | WhatsApp self-serve deflects 60% of queries. One agent should handle the rest for the first 6 months. | WhatsApp self-serve deflects 60% of queries. One agent should handle the rest for the first 6 months. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe that WhatsApp two-way communication plus an order tracking page will deflect 60% of support queries, allowing one support agent to handle the remainder without a dedicated helpdesk tool for the first 6 months. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  Most support queries are Where is my order — solved entirely by the tracking page<br>2.  I want to return is solved by the WhatsApp two-way flow without human intervention<br>3.  Wrong item received is solved by WhatsApp with a photo submission flow<br>4.  Edge cases requiring a human are fewer than 40% of total query volume |
| R | RISKS — if any assumption is wrong<br>1.  If query volume exceeds one agent's capacity → need Freshdesk or Zendesk integration earlier than planned<br>2.  If WhatsApp Business API has downtime → no fallback support channel → need email as backup from day one |
| M | METRICS — how we know if we are right<br>1.  Support query volume per 100 orders < 15 — industry average is 20 to 25<br>2.  WhatsApp self-serve resolution rate > 60%<br>3.  Average resolution time for human-handled queries < 24 hours<br>4.  Post-resolution customer satisfaction score > 4 out of 5 |
| T | TEST — smallest thing to build to validate first<br>1.  Build WhatsApp flow for 3 core intents only: order status check, return request, replacement request<br>2.  Track Week 1: what percentage of queries are resolved without any human involvement?<br>3.  If self-serve rate is below 40% in Week 2 → review flow logic and copy before scaling |




| Cross-Cutting — Platform Bet<br>Runs across all personas. Not tied to one journey or one screen. |
| --- |


| 11 | WhatsApp Notification Touchpoint | Cross |
| --- | --- | --- |
| Not a persona — a platform bet. WhatsApp is the primary post-purchase communication layer for this demographic. | Not a persona — a platform bet. WhatsApp is the primary post-purchase communication layer for this demographic. | Not a persona — a platform bet. WhatsApp is the primary post-purchase communication layer for this demographic. |
| H | HYPOTHESIS — the bet we are placing<br>1.  We believe WhatsApp notifications across the full order journey — confirmation, dispatch, delivery, and return updates — will reduce inbound support queries by 50% and increase customer satisfaction versus SMS-only communication. |
| A | ASSUMPTIONS — must be true for this to hold<br>1.  Working men 25–40 check WhatsApp significantly more than email or SMS in the Indian market<br>2.  Rich WhatsApp messages with order image, tracking link, and CTA buttons are more actionable than plain SMS<br>3.  Two-way WhatsApp — reply to initiate return or check status — feels natural and not intrusive<br>4.  WhatsApp Business API approval will not delay MVP launch — application is submitted at project start |
| R | RISKS — if any assumption is wrong<br>1.  API approval is delayed → fall back to one-way SMS for MVP launch and add WhatsApp in v1.1<br>2.  Users opt out of WhatsApp notifications → need SMS as a mandatory fallback channel always available<br>3.  Two-way flow is misunderstood → users send freeform replies the bot cannot handle → frustration |
| M | METRICS — how we know if we are right<br>1.  WhatsApp message delivery rate > 95%<br>2.  Message read rate > 70% across the full post-order journey sequence<br>3.  Inbound Where is my order queries < 10 per 100 orders — down from the industry average of 20 to 25<br>4.  Return initiation via WhatsApp > 70% of all return requests versus phone or email |
| T | TEST — smallest thing to build to validate first<br>1.  Phase 1 if API is delayed: one-way WhatsApp via link-based messages — no API required, just a WhatsApp link<br>2.  Phase 2: full two-way API with 3 core flows — track order, initiate return, request replacement<br>3.  Compare a SMS-only week against a WhatsApp week and measure support query volume delta<br>4.  Apply for WhatsApp Business API on Day 1 of the project — 17 templates, allow 3 to 7 days approval per batch |




# 5.  HDD Master Summary

One row per persona. The Key Metric column is what you check every Monday morning.

| # | Persona | Core Hypothesis (condensed) | Biggest Risk | Key Metric | P |
| --- | --- | --- | --- | --- | --- |
| 1 | Intent Buyer | Fabric-first USP wins over Myntra | USP does not resonate | Fabric filter usage > 40% | P0 |
| 2 | Mobile-First | Full purchase on mobile in under 4 steps | Images not convincing on small screen | Mobile checkout rate > 55% | P0 |
| 3 | Guest Checkout | OTP guest checkout lifts completion 25% | COD fraud from unverified guests | Guest vs registered abandonment | P0 |
| 4 | Brand Admin | Single panel sufficient for 6 months | Order volume spikes unexpectedly | Product add time < 10 min | P0 |
| 5 | Deal Hunter | Launch coupon triggers first purchase | Brand perceived as discount-first | Coupon user 60-day return rate | P1 |
| 6 | Casual Browser | Fabric storytelling holds attention 2+ min | Social traffic does not convert | Wishlist add rate > 15% | P1 |
| 7 | Size-Confused | Inline size guide cuts size returns 30% | Guide is ignored by users | Size-related return rate < 15% | P1 |
| 8 | Loyal Customer | WA fabric-match triggers repurchase in 60 days | Messages feel spammy — users block | 60-day repurchase rate > 25% | P1 |
| 9 | Inventory Mgr | CSV bulk upload under 15 min for full catalog | CSV errors drive manual fallback | Upload success rate > 90% | P1 |
| 10 | Support Agent | WA deflects 60% of support queries | Query volume exceeds one agent | Self-serve resolution > 60% | P2 |
| 11 | WhatsApp Touchpoint | WA notifications cut inbound queries 50% | API approval delayed at launch | Message read rate > 70% | Cross |


## 5.1  The Monday Dashboard — 5 Metrics to Watch

These are the only 5 numbers to check every Monday in the first 3 months. Any one in the red becomes the top priority above all new feature work.

| Metric | Target | Red if… | Immediate action |
| --- | --- | --- | --- |
| Mobile checkout completion | > 55% | < 40% | Audit each step — find the specific drop-off point and fix it this week |
| Fabric filter usage | > 40% | < 20% | Fabric-first USP is not landing — revisit PDP layout and filter prominence |
| Size-related return rate | < 15% | > 25% | Size guide is not working — add measurement video or chat-based sizing help |
| 60-day repurchase rate | > 25% | < 10% | WhatsApp re-engagement sequence is broken — audit message timing and copy |
| WA self-serve resolution | > 60% | < 40% | Bot flows are failing — map where users drop out and add human handoff |



# 6.  Document Chain — Where HDD Feeds

This HDD is the foundation of the entire design system. Every document below derives from a hypothesis in Section 4.

| Document | Derives from HDD | Status |
| --- | --- | --- |
| HDD v1.0 — this document | Foundation — all hypotheses, assumptions, metrics | Complete |
| HLD v3.0 | Architecture driven by P0 personas 1–4 | Complete |
| Security Design v1.0 | Guest checkout risk (P3), DPDPA compliance, COD fraud | Complete |
| User Journey Maps v2.0 | Per-persona flows derived from the T row of each H-A-R-M-T block | Complete |
| LLD v1.1 | DB schema and service patterns from all P0 + P1 data needs | Complete |
| CDD v1.1 | 58 components from journey maps and HDD screen test requirements | Complete |
| API Design v1.1 | 106 endpoints — one per metric data requirement | Complete |
| DevOps Runbook v1.0 | Infrastructure for PWA, CDN, WhatsApp API from P0 and Cross | Complete |
| Dev Kickoff Guide v1.0 | 6 non-negotiable rules each trace to a P0 risk item | Complete |
| Screen Prompt Pack v1.0 | 44 screens — each screen maps to a T-row test requirement | Complete |


## 6.1  Build Order Traceability

The build sequence in the Dev Kickoff Guide follows hypothesis risk — highest-risk hypotheses unlock their validation earliest.

→  Foundation layer — monorepo, DB, CI/CD — unblocks all validation
→  Auth Service — validates P0 Hypothesis 3: Guest Checkout OTP completion rate
→  Catalog + Search — validates P0 Hypothesis 1: Fabric filter usage > 40%
→  Cart + Pincode + Checkout — validates P0 Hypothesis 2: Mobile checkout completion > 55%
→  Order + Payment — validates P0 Hypothesis 4: Admin panel order processing < 5 minutes
→  Notification Service — validates Cross Hypothesis 11: WhatsApp message read rate > 70%
→  Size Guide on PDP — validates P1 Hypothesis 7: Size-related return rate < 15%
→  WhatsApp re-engagement sequence — validates P1 Hypothesis 8: 60-day repurchase > 25%
