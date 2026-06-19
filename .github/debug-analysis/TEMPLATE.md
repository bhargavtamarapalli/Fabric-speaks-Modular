# Analysis Template for Debug Agent

Use this template when creating a new analysis. Save as `.github/debug-analysis/[FEATURE]_analysis.md`

---

# Debug Analysis: [FEATURE_NAME]

**Date:** YYYY-MM-DD  
**Analyzed by:** Admin Flow Debugger Agent  
**Status:** ✅ Complete  
**Developer Changes Required:** Yes / No  

---

## 1. Basic Flow Analysis

### Request Entry Point
**File:** `services/admin-service/src/routes/[resource].routes.ts`  
**Endpoint:** `[METHOD] /admin/[resource]/[operation]`  
**Authentication:** ✅ Verified / ⚠️ Missing / ❌ Broken  
**Authorization:** ✅ Verified / ⚠️ Partial / ❌ Missing  

### Complete Flow Path

```
Request
  ↓
Route Handler: [file.ts:line]
  ↓
Controller: [controller.ts:line]
  ↓
Service: [service.ts:line]
  ↓  
Repository: [repository.ts:line]
  ↓
Database: [query type]
  ↓
Response
```

### Step-by-Step Breakdown

| Step | File | Function | Line | Responsibility | Status |
|------|------|----------|------|-----------------|--------|
| 1 | routes.ts | routeHandler | 45 | Define route, validate params | ✅ |
| 2 | controller.ts | handler | 120 | Extract request data, delegate | ✅ |
| 3 | service.ts | businessLogic | 200 | Validate business rules | ✅ |
| 4 | repository.ts | dbOperation | 300 | Execute query | ✅ |
| 5 | database | n/a | query | Persist/retrieve data | ✅ |

### Data Transformations

```
Request Body: {field: type}
  ↓ Validation: [rules applied]
  ↓ Service Input: {dto: type}
  ↓ Business Logic: [transformations]
  ↓ DB Query: [SQL/query structure]
  ↓ Response: {shape}
```

---

## 2. Error Handling Verification

### All Possible Error Scenarios

| Scenario | Where It Can Occur | Current Handling | HTTP Status | Client Message | Logged? | Sentry? | Gap? |
|----------|-------------------|------------------|------------|-----------------|---------|---------|------|
| Invalid input format | Controller validation | 400 response | 400 | "Field 'x' is invalid" | ✅ | ❌ | ⚠️ No Sentry |
| Missing required field | Controller validation | 400 response | 400 | "Field 'x' is required" | ✅ | ❌ | ⚠️ |
| Resource not found | Repository query | 404 response | 404 | "Resource not found" | ✅ | ❌ | ✅ |
| User lacks permission | Auth middleware | 403 response | 403 | "Unauthorized" | ✅ | ✅ | ✅ |
| Validation failed (business) | Service validation | 422 response | 422 | Specific field error | ✅ | ❌ | ⚠️ |
| Database constraint | Repository commit | 409 response | 409 | "Resource already exists" | ✅ | ⚠️ | ⚠️ |
| Concurrent update | Service transaction | 409 response | 409 | "Conflict, please retry" | ✅ | ✅ | ✅ |
| Database timeout | Repository query | 503 response | 503 | "Service temporarily unavailable" | ✅ | ✅ | ✅ |
| Rate limit exceeded | Middleware | 429 response | 429 | "Too many requests" | ✅ | ❌ | ⚠️ |
| Unexpected error | Controller catch-all | 500 response | 500 | "Internal server error" | ✅ | ✅ | ✅ |

### Critical Error Handling Gaps

#### Gap #1: [Issue Description]
- **Severity:** HIGH / MEDIUM / LOW
- **Location:** [file.ts:line]
- **Problem:** [What code does vs what it should]
- **Trigger:** How to reproduce
- **Impact:** What breaks or risks
- **Recommended Fix:**
  ```typescript
  // Show code example
  ```

#### Gap #2: [Continue as needed...]

---

## 3. Edge Case Management

### 3.1 Boundary Conditions

| Condition | Test Case | Current Behavior | Expected | Status | Fix Needed |
|-----------|-----------|-------------------|----------|--------|-----------|
| Empty list | `items: []` | Returns `null` | Returns `[]` | ❌ | Replace null with empty array |
| Single item | `items: [1]` | ✅ Works | ✅ Works | ✅ | None |
| Max batch size (100) | Create 100 items | ✅ Works | ✅ Works | ✅ | None |
| Over max (101) | Create 101 items | 500 error | 400 error | ⚠️ | Add batch size validation |
| Null value | `field: null` | Crashes | Return 400 | ❌ | Add null check |
| Empty string | `field: ""` | Accepts | 400 reject | ⚠️ | Add empty string validation |
| Very long string | `name: "..."` (5000 chars) | Accepts | Reject/truncate | ⚠️ | Add length validation |

### 3.2 Concurrent Update Scenarios

**Scenario: Two users update same resource simultaneously**

```
User A: PATCH /admin/products/123 { price: 100 }
User B: PATCH /admin/products/123 { stock: 50 }
```

- **Current Behavior:** [What happens - race condition, lost update, etc.]
- **Expected Behavior:** [One succeeds, one gets version conflict]
- **Gap:** [Description and severity]
- **Fix:** [Use optimistic locking, SERIALIZABLE transaction, etc.]

### 3.3 Permission & Security Issues

| Edge Case | Description | Current | Expected | Gap? |
|-----------|-------------|---------|----------|------|
| User without role | Access without permission | Allows | Rejects | ❌ |
| Permission revoked mid-op | Permission changes during operation | Success | Rejected | ⚠️ |
| Cross-tenant access | Access user's data from other tenant | Allows | Rejects | ❌ |
| Role escalation attempt | User tries to grant self admin | Allows | Rejects | ❌ |
| Soft-deleted access | User accesses deleted resource | Allows | Rejects | ⚠️ |

### 3.4 Data Validation Issues

- [ ] **Integer overflow:** `quantity: 999999999`
- [ ] **Float precision:** `price: 19.99999999`
- [ ] **Enum violation:** `status: "INVALID_STATE"`
- [ ] **Email format:** Invalid email accepts
- [ ] **Phone format:** Non-phone string accepts
- [ ] **Date format:** Future-only field accepts past date
- [ ] **Required relationships:** Missing foreign key accepts

### 3.5 Database-Level Edge Cases

| Edge Case | Current | Expected | Status |
|-----------|---------|----------|--------|
| Unique constraint violation | Generic 500 error | Specific 409 error | ⚠️ |
| Foreign key violation | Generic 500 error | Specific 400 error | ⚠️ |
| Deadlock in transaction | Crashes | Automatic retry | ❌ |
| Transaction timeout | 500 error | Retry or 504 | ⚠️ |
| Connection pool exhausted | Cascading timeout | Queued gracefully | ⚠️ |

### 3.6 Caching & Stale Data Issues

- [ ] Cache invalidation on update
- [ ] Stale data returned to user
- [ ] Cache hit with wrong permission level
- [ ] Distributed cache consistency

### 3.7 State Machine Violations

For resources with status fields (Order: pending→processing→shipped, etc.):

- [ ] Invalid transition allowed (e.g., shipped→pending)
- [ ] Double transition protection (idempotency)
- [ ] Concurrent status changes
- [ ] Status change without required fields

---

## Critical Issues Summary

### 🔴 CRITICAL (Block Production Release)

1. **[Issue #1]**
   - Severity: CRITICAL
   - Trigger: [How to reproduce]
   - Impact: [Data loss / Security risk / System crash]
   - Fix: [Code example]

2. [Continue...]

### 🟠 IMPORTANT (Must Fix in Next Sprint)

1. **[Issue]**
   - Severity: HIGH
   - Fix: [Brief description]

### 🟡 NICE-TO-HAVE (Consider for Future)

1. **[Issue]**
   - Why it matters: [Brief explanation]

---

## Test Coverage Analysis

### Current Test Coverage
- Unit tests: ✅ / ⚠️ / ❌
- Integration tests: ✅ / ⚠️ / ❌
- E2E tests: ✅ / ⚠️ / ❌

### Recommended Test Cases to Add
1. Test case: [Description]
   - File: [test-file.ts]
   - Lines to test: [File:line range]

---

## Performance & Scalability Notes

- Query optimization opportunities: [List any N+1, improve indices, etc.]
- Batch operation limits: [Current vs recommended]
- Caching opportunities: [What could be cached]
- Timeout risks: [Operations over 3s]

---

## References

**Project Documentation Searched:**
- [Documents found or not found]

**Code Files Analyzed:**
- `services/admin-service/src/routes/[resource].routes.ts`
- `services/admin-service/src/controllers/[resource].controller.ts`
- `services/admin-service/src/services/[resource].service.ts`
- `services/admin-service/src/repositories/[resource].repository.ts`

**Related Analysis Files:**
- [Link to previous analyses if any]

**Design Documents:**
- [Links to HDD/LLD if applicable]

---

## Sign-Off

- **Analyzer:** Debug Agent
- **Analysis Date:** YYYY-MM-DD
- **Review Status:** Pending Developer Review
- **Follow-Up Actions:** 
  - [ ] Developer reviews and creates tickets
  - [ ] Tickets assigned to sprint
  - [ ] Changes implemented
  - [ ] Re-analysis after fixes
