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
