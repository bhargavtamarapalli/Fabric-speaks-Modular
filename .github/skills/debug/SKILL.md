---
name: debug-admin-module
description: "Use when: tracing execution paths, finding defects in CRUD operations, auditing database queries, testing concurrency bugs, validating transaction isolation, checking N+1 queries, debugging race conditions, validating error handling at boundaries, inspecting middleware chains. Multi-step systematic code walkthrough specialized for Admin Product Management module debugging across Express controllers → repositories → SQL → database."
---

# Admin Module Systematic Debug Skill

## Purpose

Conduct exhaustive end-to-end tracing and defect discovery across the Admin Product Management module, with focus on:
- Data flow from API entry points to database queries
- Transaction boundaries and multi-step operation atomicity
- Concurrency control and race condition vectors
- Error handling gaps and swallowed exceptions
- N+1 query patterns and missing indexes
- Cascade behavior on deletions and soft-deletes

## Stack Context

- **Frontend**: Next.js 14, TypeScript, Zod validation, SWR/Axios
- **Backend**: Node.js 18+, Express, TypeScript, raw SQL (no ORM)
- **Database**: PostgreSQL with connection pooling, raw SQL migrations
- **Patterns**: Repository Pattern, Service Layer, Middleware Chain
- **Concurrency**: No explicit locking visible; need to audit for optimistic/pessimistic mechanisms

## Execution Strategy

### Phase 1: Map Entry Points & Data Flow
1. Identify HTTP endpoint → Controller → Service → Repository → SQL query chain
2. Trace request validation (Zod schemas, middleware)
3. Map response serialization and error transformation
4. Document all database query origins and result handling

### Phase 2: Audit CRUD Operations
For each CRUD (Create, Read, Update, Delete):
1. **Input Validation**: Check Zod schema, type guards, sanitization
2. **Authorization**: Verify role-based access control at endpoint and service layer
3. **Data Integrity**: Inspect foreign key constraints, unique constraints, NOT NULL checks in SQL
4. **Transactions**: Look for BEGIN/COMMIT/ROLLBACK or connection-level transaction management
5. **Concurrency**: Check for WHERE clauses that prevent lost updates (version fields, timestamps)
6. **Cascade**: Trace DELETE operations — what happens to dependent records? Are foreign keys ON DELETE CASCADE?
7. **Response**: Verify sensitive data is not exposed, error codes are actionable

### Phase 3: Concurrency & Transaction Analysis
1. **Race Conditions**: Are simultaneous updates to the same product/stock possible? Can two admins increment stock from 10 to 11 instead of 12?
2. **Isolation Level**: Confirm PostgreSQL transaction isolation (default = READ COMMITTED; should be REPEATABLE READ or SERIALIZABLE for sensitive ops)
3. **Locking Strategy**: Identify pessimistic locks (SELECT ... FOR UPDATE), optimistic locks (version/timestamp fields), or none
4. **Deadlock Risk**: Review lock acquisition order across multi-table operations
5. **Retry Logic**: Check if failed transactions have exponential backoff or max retry limits

### Phase 4: Bulk Operation Deep Dive
1. **Atomicity Model**: Is bulk update all-or-nothing, batch-committed, or per-record independent?
2. **Payload Handling**: What's the parsing strategy? Streaming, buffering, chunking?
3. **Mixed Valid/Invalid**: How are partial successes reported? Is error consolidation clear?
4. **Idempotency**: Can retry of the same bulk request cause duplicate writes?
5. **Performance**: What are chunk sizes, timeout limits, and memory characteristics?
6. **Cascading Effects**: Do bulk updates trigger individual hooks (validations, events, audit logs), or do they batch-skip business logic?

### Phase 5: Gap Detection
1. **Swallowed Exceptions**: Search for catch blocks with no logging or empty catch bodies
2. **Generic Error Responses**: Are 500 errors returned instead of specific codes?
3. **Missing Authorization**: Are there endpoints without role/permission checks?
4. **Audit Trail Gaps**: Can every admin action be traced to a user + timestamp + before/after state?
5. **Hardcoded Values**: Search for magic numbers, environment-specific logic in shared code
6. **Missing Rollback**: Can failed partial bulk operations be undone?

## Code Inspection Checklist

### Controllers & Routes
- [ ] Every endpoint has authorization middleware
- [ ] Input validation happens before business logic (Zod schema applied)
- [ ] Error responses are consistent (standardized error shape)
- [ ] All exceptions are caught and logged with context
- [ ] HTTP status codes match error severity (400 vs 500 vs 409)

### Services & Business Logic
- [ ] Database transactions wrap all multi-step writes (BEGIN...COMMIT)
- [ ] Retry logic with exponential backoff for transient failures
- [ ] All external dependencies (cache, queues) are properly handled on failure
- [ ] Event emissions fire consistently (no conditional skipping)
- [ ] Audit logging captures before/after state for mutations

### Repositories & SQL
- [ ] All queries are parameterized (no string concatenation)
- [ ] Indexes exist on frequently queried columns (WHERE, JOIN, ORDER BY)
- [ ] N+1 queries are absent (eager loading via JOINs not multiple queries)
- [ ] Foreign key constraints are defined with appropriate CASCADE/RESTRICT
- [ ] Pagination uses keyset cursor or LIMIT/OFFSET with index coverage

### Concurrency & Transactions
- [ ] Critical sections use explicit transaction boundaries
- [ ] Optimistic locking (version field) or pessimistic locking (SELECT...FOR UPDATE) for high-contention tables
- [ ] Isolation level is explicitly set for sensitive operations (SERIALIZABLE for financial, REPEATABLE READ for inventory)
- [ ] Deadlock handling includes retry with backoff
- [ ] No unbounded loops that could hold locks indefinitely

### Error Handling
- [ ] No empty catch blocks or generic catch-alls
- [ ] Every throw includes error code + message + context (user ID, resource ID, operation type)
- [ ] Logs are structured (JSON-friendly, contextual fields)
- [ ] Sensitive data (passwords, API keys, PII) is never logged
- [ ] Client receives non-sensitive error messages but server logs contain full context

## Output Format

For each finding, report:
```
**[SEVERITY]** [Category] — [File]:[Line]

**Issue**: [Specific problem description]
**Code**: [Snippet or query]
**Impact**: [Consequences: data loss, race condition, security breach, etc.]
**Fix**: [Concrete remediation steps]
```

Severity levels: **CRITICAL** → **HIGH** → **MEDIUM** → **LOW** → **NITPICK**
