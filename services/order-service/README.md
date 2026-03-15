# Order Service

Service for managing the order lifecycle, payment coordination, and shipping integration.

## Key Features
- **Order Lifecycle**: Manages states from `PLACED` to `DELIVERED` with state machine validation.
- **Bulk Status Update**: Sequential or batch updates to order statuses (ORD-06).
- **Logistics Integration**: Deep integration with Shiprocket for AWB generation and tracking (ORD-05).
- **Payment Reconciliation**: Coordination with Razorpay webhooks for payment capture and refunds.
- **Export**: Order data export to CSV for financial reporting (ORD-11).
- **Timeline**: Chronological event tracking for every order (ORD-16).

## Tech Stack
- **Runtime**: Node.js / TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Webhooks**: Razorpay, Shiprocket (Signature validated)

## Administrative Endpoints
- `GET /admin/orders` - List and filter orders
- `PATCH /admin/orders/bulk-status` - Bulk update status
- `POST /admin/orders/:id/push-shiprocket` - Push to logistics
- `GET /admin/orders/export` - Export orders to CSV
