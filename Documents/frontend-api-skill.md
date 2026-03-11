# SKILL: Frontend — Next.js 14 + Framer Motion
# Load this when: building any screen, component, animation
# Antigravity: add to Knowledge Base as "frontend-skill"

## Design Token Usage

```css
/* Always use CSS variables — never hardcode hex values */
:root {
  --fs-void:      #0A0A0A;   /* page background */
  --fs-surface:   #111111;   /* cards, drawers */
  --fs-surface-2: #1A1A1A;   /* elevated elements */
  --fs-linen:     #C9A96E;   /* primary accent — CTAs, prices, highlights */
  --fs-ivory:     #F0EBE3;   /* primary text */
  --fs-ash:       #6B6560;   /* secondary text */
  --fs-wire:      #252525;   /* all borders */
  --fs-error:     #B84C3C;
  --fs-success:   #2D6A4F;
}
```

## Page Entry Animation — Curtain Wipe (every page)

```tsx
// app/products/page.tsx
'use client';
import { motion } from 'framer-motion';

export default function ProductsPage() {
  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* page content */}
    </motion.div>
  );
}
```

## Stagger Scroll Reveal — Any List/Grid

```tsx
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden:  { y: 30, opacity: 0 },
  visible: { y: 0,  opacity: 1, transition: { duration: 0.4 } }
};

<motion.div variants={container} initial="hidden" whileInView="visible"
  viewport={{ once: true, margin: '-60px' }}>
  {products.map(p => (
    <motion.div key={p.id} variants={item}>
      <ProductCard product={p} />
    </motion.div>
  ))}
</motion.div>
```

## SpiderLoader — Use on ALL async states

```tsx
// Never use a generic spinner. Always SpiderLoader.
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

// While fetching:
if (isLoading) return <SpiderLoader size="md" />;  // sm | md | lg
```

## Slide-Up Drawer (Cart, Filter Panel)

```tsx
<motion.div
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  className="fixed bottom-0 left-0 right-0 bg-[var(--fs-surface)] rounded-t-sm"
>
```

## Magnetic Button (all primary CTAs on desktop)

```tsx
'use client';
import { motion, useSpring } from 'framer-motion';

export function MagneticButton({ children, onClick }) {
  const x = useSpring(0, { stiffness: 150, damping: 15 });
  const y = useSpring(0, { stiffness: 150, damping: 15 });

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  }

  return (
    <motion.button style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onClick={onClick}
      className="px-8 py-4 uppercase tracking-[0.15em] text-sm font-medium
                 bg-[var(--fs-linen)] text-[var(--fs-void)]
                 border border-[var(--fs-linen)]"
    >
      {children}
    </motion.button>
  );
}
```

## API Call Pattern (fetch with error handling)

```typescript
// lib/api.ts — shared fetch wrapper
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',  // sends JWT cookie
  });
  const data = await res.json();
  if (!data.success) throw new ApiError(data.error.code, data.error.message);
  return data.data as T;
}

// Usage in component
const product = await apiFetch<Product>(`/products/${slug}`);
```

## Component File Structure

```tsx
// components/molecules/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  onWishlistToggle?: (id: string) => void;
}

export function ProductCard({ product, onWishlistToggle }: ProductCardProps) {
  // ...
}
```

---

# SKILL: API Endpoint Implementation Guide
# Load this when: implementing any specific endpoint
# Antigravity: add to Knowledge Base as "api-skill"

## How to implement an endpoint from API Design v1.1

When told "implement CAT-02", look up the endpoint in API Design v1.1 and follow this checklist:

1. **Schema first** — create Zod schema in `services/{service}/src/schemas/`
2. **Repository method** — add to repository interface + implementation
3. **Service method** — business logic, throws AppError on failure
4. **Controller** — parse → call service → return envelope
5. **Route** — add to router with correct auth middleware
6. **Test** — unit test service, integration test route

## Auth Middleware Reference

```typescript
// In api-gateway — sets req.user from verified JWT
requireAuth           // any authenticated user (customer or admin)
requireRole('superAdmin')
requireRole('superAdmin', 'inventoryManager')
requireRole('superAdmin', 'inventoryManager', 'supportAgent')
// Public endpoints: no middleware
```

## Pagination — Standard Implementation

```typescript
// Service
async listProducts(filters: Filters, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    this.productRepo.findAll(filters, limit, offset),
    this.productRepo.count(filters),
  ]);
  return { items, total: countResult };
}

// Controller
res.json({
  success: true,
  data: { items },
  meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
});
```

## Webhook Pattern (Razorpay / Shiprocket / WhatsApp)

```typescript
// ALWAYS process webhooks via BullMQ — never inline
router.post('/webhooks/razorpay', async (req, res) => {
  // 1. Validate signature FIRST (before anything else)
  const signature = req.headers['x-razorpay-signature'];
  const isValid = validateRazorpaySignature(req.rawBody, signature);
  if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

  // 2. Idempotency check
  const paymentId = req.body.payload.payment.entity.id;
  const alreadyProcessed = await idempotencyRepo.check(paymentId);
  if (alreadyProcessed) return res.status(200).json({ received: true });

  // 3. Queue — return 200 immediately
  await razorpayWebhookQueue.add('payment_webhook', req.body);
  res.status(200).json({ received: true });
});
```
