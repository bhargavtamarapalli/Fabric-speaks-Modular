# Integration & Webhook API Suite — v1.0
**Context**: Fabric Speaks ↔ External Partners (WhatsApp, Razorpay, Shiprocket)
**Security**: Mandatory HMAC signature validation or Auth Bearer token verification.

## 1. WhatsApp Cloud API Webhook
**Endpoint**: `POST /api/v1/webhooks/whatsapp`
**Security**: `X-Hub-Signature-256` validation.

### `POST /webhooks/whatsapp` (Inbound)
- **Desc**: Handles customer replies (Persona 10).
- **Triggers**: Keyword routing (YES/TRACK/RETURN/HELP).
- **Service**: Notification Svc.

### `POST /webhooks/whatsapp` (Status Delivery)
- **Desc**: Handles delivery reports (`sent`, `delivered`, `read`).
- **Logic**: Updates `notification_log` table for admin analytics.

---

## 2. Razorpay Payment Webhook
**Endpoint**: `POST /api/v1/webhooks/razorpay`
**Security**: `X-Razorpay-Signature` validation using webhook secret.

### `POST /webhooks/razorpay` (Payment Events)
- **Event**: `payment.captured`
  - **Action**: Order Svc sets status to `PAID` + Inventory Svc row-lock update.
- **Event**: `payment.failed`
  - **Action**: Notification Svc queues `PAYMENT_FAILED` WA message.
- **Idempotency**: Webhook `payload.payment.entity.id` used to prevent duplicate processing.

---

## 3. Shiprocket Logistics Webhook
**Endpoint**: `POST /api/v1/webhooks/shiprocket`
**Security**: Auth Bearer Token in header.

### `POST /webhooks/shiprocket` (Tracking Status)
- **Event**: `AWB_ASSIGNED`
  - **Action**: Update `orders.awb_number`.
- **Event**: `SHIPPED`
  - **Action**: Notification Svc triggers `ORDER_SHIPPED` WA message.
- **Event**: `DELIVERY_ATTEMPT_FAILED`
  - **Action**: Trigger proactive support queue entry (Op G11).

---

## 4. Internal Integration Clients (Outbound)
How Fabric Speaks calling external APIs.

### `LogisticsClient`
- **Actions**: Create Shipment, Generate AWB, Cancel Pickup, Get Tracking.
- **Service**: Order Management.

### `PaymentClient`
- **Actions**: Create Razorpay Order, Initiate Refund, Check Payment Status.
- **Service**: Payment Service.

### `WhatsAppClient`
- **Actions**: Send Template Message, Get Window Status, Send Broadcast.
- **Service**: Notification Service.
