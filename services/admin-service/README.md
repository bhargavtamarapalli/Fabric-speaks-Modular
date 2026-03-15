# Admin Service

Service for managing administrative operations, store configurations, content, and analytics for the FabricSpeaks platform.

## Key Features
- **Admin User Management**: CRUD for administrative users with role-based access control.
- **Store Settings**: Management of global store configurations (Tax, Currency, Contact Info).
- **Homepage & Navigation**: Dynamic control over homepage sections and header navigation.
- **Promotions (Sale Events)**: Scheduling and managing store-wide or targeted discounts.
- **Banner Management**: CRUD for promotional hero and secondary banners.
- **Analytics Dashboard**: Real-time business metrics, revenue trends, and system health.
- **Audit Logging**: Comprehensive Rule 6 compliant audit trail for all administrative actions.

## Tech Stack
- **Runtime**: Node.js / TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via `getDbPool`)
- **Cache**: Redis (ioredis)
- **Validation**: Zod
- **Testing**: Vitest

## Getting Started
1. Install dependencies: `npm install`
2. Configure environment: `.env`
3. Run development: `npm run dev`
4. Run tests: `npm test`

## API Endpoints (Admin)
- `GET /admin/users` - List admin users
- `POST /admin/users` - Create admin user
- `GET /admin/settings` - Get store settings
- `PATCH /admin/homepage` - Update homepage config
- `POST /admin/content/sales` - Create sale event
- `GET /admin/dashboard` - Get business metrics
- `GET /admin/audit-logs` - Query audit trail
