# Catalog Service

Service for managing product catalog, smart/manual collections, and customer reviews.

## Key Features
- **Product Management**: CRUD for products and variants, including SEO meta and USP tags.
- **Bulk Upload**: Asynchronous product/variant upload via CSV/JSON (Rule 3 compliant).
- **Collections**: Rule-based (smart) and manual collection management with scheduling.
- **Reviews**: Verified purchase review management with administrative approval gates.
- **Active Search**: Real-time product search with relevance and availability filtering.

## Tech Stack
- **Runtime**: Node.js / TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Search**: Integration with Search Service
- **Testing**: Vitest

## Administrative Endpoints
- `GET /admin/products` - List products with inventory context
- `POST /admin/products` - Create new product
- `POST /admin/products/bulk` - Queue bulk upload
- `GET /admin/collections` - Manage collections
- `PATCH /admin/reviews/:id/approve` - Approve customer review
