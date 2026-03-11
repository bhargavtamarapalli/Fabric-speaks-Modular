# Admin & Operational API Suite — v1.0
**Base Path**: `/api/v1/admin`
**Security**: Requires role-based JWT custom claims (`superAdmin`, `inventoryManager`, `supportAgent`).

## 1. Dashboard & Reports (Persona 7, 9)
High-level operational overview from the read replica.

### `GET /dashboard/ops`
- **Desc**: Returns the 5 panels for the Daily Ops Dashboard.
- **Roles**: `superAdmin`, `supportAgent`.
- **Response**: `{ "orders": {}, "payments": {}, "cod_pending": {}, "shipping_issues": {}, "fraud": {} }`

---

## 2. Catalog & Product Admin (Persona 7)
Managing the product lifecycle.

### `POST /products`
- **Desc**: Create a new product.
- **Roles**: `superAdmin`.

### `POST /products/:id/duplicate`
- **Desc**: Clones a product and its variants (Op G1).
- **Roles**: `superAdmin`.

### `PATCH /products/:id/deactivate`
- **Desc**: Soft delete product + cascade deactivation check (Op G2).
- **Roles**: `superAdmin`.

### `PATCH /products/:id/variants/:sku`
- **Desc**: Bulk variants matrix edit. Includes `sale_price` and `sale_active`.
- **Roles**: `superAdmin`.

---

## 3. Inventory Management (Persona 8)
Variant-level stock control.

### `GET /inventory/health`
- **Desc**: Traffic-light status for all SKUs.
- **Roles**: `superAdmin`, `inventoryManager`, `supportAgent` (read-only).

### `POST /inventory/adjust`
- **Desc**: Manual stock adjustment (Op G8).
- **Body**: `{ "variant_id": "v1", "qty": 45, "reason": "damaged_in_warehouse" }`
- **Roles**: `superAdmin`, `inventoryManager`.

### `POST /inventory/expected`
- **Desc**: Plan expected stock arrival + WA reminder trigger (Op G9).
- **Roles**: `superAdmin`, `inventoryManager`.

---

## 4. Support & Returns (Persona 9)
Handling post-purchase issues.

### `GET /support/customer/:mobile`
- **Desc**: Customer 360 view (Orders, Returns, Payments).
- **Roles**: `superAdmin`, `supportAgent`.

### `POST /returns/:id/approve`
- **Desc**: Approve return. Supports `fast_track` flag (Op G12).
- **Roles**: `superAdmin`, `supportAgent`.

### `PATCH /support/fraud/flag`
- **Desc**: Flag mobile for fraud review/blacklist (Op G14).
- **Roles**: `superAdmin`, `supportAgent`.

---

## 5. Marketing & Config (Persona 3, 7)
Config-driven UI and re-engagement.

### `PATCH /config/homepage`
- **Desc**: Update 7 sections of the homepage (Admin G3).
- **Roles**: `superAdmin`.

### `POST /campaigns/broadcast`
- **Desc**: Schedule a WA broadcast with frequency capping (Admin G5).
- **Body**: `{ "template": "SALE_LAUNCH", "audience": "ALL_LINEN_BUYERS" }`
- **Roles**: `superAdmin`.
