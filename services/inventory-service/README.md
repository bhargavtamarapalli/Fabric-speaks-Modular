# Inventory Service

Service for managing product stock, stock adjustments, and replenishment intelligence.

## Key Features
- **Stock Tracking**: Real-time inventory levels for variants.
- **Stock Adjustments**: Audit-compliant stock adjustments with reason codes (Rule 2).
- **Bulk Adjustments**: Efficient batch updates to inventory levels.
- **Stock Velocity**: Analytics for "Days of stock remaining" (INV-09).
- **Restock Suggestions**: Intelligent suggestions based on sales velocity (INV-10).
- **Low Stock Alerts**: Configurable thresholds for automated admin notifications.

## Tech Stack
- **Runtime**: Node.js / TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Concurrency**: `SELECT ... FOR UPDATE` for transactional stock safety.

## Administrative Endpoints
- `GET /admin/inventory` - List inventory with search
- `POST /admin/inventory/adjust` - Bulk stock adjustment
- `GET /admin/inventory/velocity` - View stock velocity metrics
- `GET /admin/inventory/suggestions` - Get restock suggestions
