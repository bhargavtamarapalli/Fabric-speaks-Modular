# Customer API Suite — v1.0
**Base Path**: `/api/v1/customer`

## 1. Auth Service
Handles authentication using Firebase and mobile OTP.

### `POST /auth/otp/send`
- **Desc**: Triggers an OTP to the mobile number.
- **Body**: `{ "mobile": "9999999999" }`
- **Response**: `200 OK` (OTP sent)

### `POST /auth/otp/verify`
- **Desc**: Verifies OTP and returns a Firebase Custom Token or JWT.
- **Body**: `{ "mobile": "9999999999", "otp": "123456" }`
- **Response**: `{ "token": "firebase_jwt", "user": { "id": "uuid", "role": "customer" } }`

---

## 2. Catalog Service
Browsing and searching for products.

### `GET /catalog/products`
- **Desc**: List products with filters and pagination.
- **Params**: `category`, `fabric`, `collection_id`, `limit`, `offset`.
- **Response**: `{ "data": [ProductObj], "metadata": { "count": 120 } }`

### `GET /catalog/products/:id`
- **Desc**: Full PDP data including variants, sale prices, and fabric specs.
- **Response**: `{ "data": DetailedProductObj }`

### `GET /catalog/search`
- **Desc**: PostgreSQL FTS search.
- **Params**: `q=linen+blue`
- **Response**: `{ "data": [ProductObj] }`

---

## 3. Cart & Checkout Service
Managing guest and authenticated carts.

### `GET /cart`
- **Desc**: Get current cart items (uses JWT or `X-Session-ID`).
- **Response**: `{ "items": [], "total": 0, "discounts": 0 }`

### `POST /cart/items`
- **Desc**: Add/Update item in cart.
- **Body**: `{ "variant_id": "v_123", "quantity": 1 }`

### `POST /checkout/address`
- **Desc**: Save shipping address and check pincode serviceability.
- **Body**: `{ "pincode": "560001", "line1": "...", ... }`
- **Response**: `{ "success": true, "delivery_estimate": "Friday" }`

---

## 4. Order Service
Order placement and tracking (Persona 1, 2, 4, 6).

### `POST /orders`
- **Desc**: Create an order. Triggers atomic stock lock.
- **Body**: `{ "method": "UPI" | "COD", "address_id": "a1" }`
- **Response**: `{ "order_id": "OR123", "razorpay_id": "pay_xyz" }`

### `GET /orders/:id/track`
- **Desc**: Track order status. Supports Guest Tracking via Order ID + OTP.
- **Response**: `{ "status": "SHIPPED", "timeline": [ ... ] }`

### `POST /orders/:id/cancel`
- **Desc**: Cancel order (only if within 30-min COD window).

---

## 5. Notification Service
WhatsApp opt-ins and preferences.

### `PATCH /notifications/preferences`
- **Desc**: Update granular channel preferences.
- **Body**: `{ "promotions": false, "order_updates": true }`

### `POST /notifications/opt-in`
- **Desc**: Direct opt-in for back-in-stock alerts.
- **Body**: `{ "variant_id": "v_123" }`
