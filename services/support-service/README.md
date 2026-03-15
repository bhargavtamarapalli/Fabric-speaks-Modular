# Support Service

Service for managing customer support queries, internal agent coordination, and communication logs.

## Key Features
- **Query Queue**: Centralized queue for customer support requests with priority and status tracking.
- **Agent Coordination**: Internal notes system for agents to collaborate on cases (SUP-06).
- **Customer Context**: Hydrated views showing order history and account status for efficient resolution.
- **WhatsApp Logs**: Real-time visibility into outbound WhatsApp communications per customer/case (SUP-08).
- **Audit Logging**: Rule 6 compliant logging for all case status changes and note additions.

## Tech Stack
- **Runtime**: Node.js / TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Concurrency**: Audit trails for all mutations.

## Administrative Endpoints
- `GET /support/cases` - List support queue
- `GET /support/cases/:id` - view case detail with WA logs
- `PATCH /support/cases/:id` - Update case status/priority
- `POST /support/cases/:id/notes` - Add agent note
- `GET /support/customers/lookup` - Search customers by mobile
