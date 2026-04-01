---
name: review-code-quality
description: "Use when: conducting code quality reviews, identifying violations of SOLID principles, detecting security vulnerabilities, evaluating test coverage gaps, analyzing logging quality, reviewing error handling consistency, checking for code duplication, evaluating API contract consistency, auditing architectural patterns. Structured approach to brutal code quality assessment with severity ranking and actionable fix recommendations."
---

# Comprehensive Code Quality Review Skill

## Purpose

Conduct a brutal, systematic code quality review focused on identifying:
- SOLID principle violations (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)
- Security vulnerabilities (SQL injection, CSRF, CORS misconfig, insecure deserialization)
- Code duplication and god functions (high cyclomatic complexity)
- Missing or inadequate test coverage
- Logging quality and debugging difficulty in production
- API contract consistency and contract testing gaps
- Architectural coupling and tight dependencies
- Missing or outdated documentation

## Code Quality Dimensions

### 1. Structural & Architectural Quality
- **Single Responsibility Principle**: Each module/function has one reason to change
- **God Functions**: Functions >200 lines, >5 nested levels, >10 cyclomatic complexity
- **Deep Nesting**: More than 3 levels of nesting within a single function
- **Tight Coupling**: Hard dependencies between layers; no dependency injection
- **Code Duplication**: Identical or near-identical logic appearing 2+ times
- **Feature Envy**: Modules accessing internal state of other modules
- **Data Clumps**: Related fields passed together through many functions (should be objects)

### 2. Security & Vulnerability Analysis
- **SQL Injection**: String concatenation in SQL queries, no parameterization
- **Mass Assignment**: All request fields blindly assigned to models without whitelist
- **CSRF Protection**: Forms/mutations lack CSRF token validation
- **Insecure Direct Object Reference (IDOR)**: No ownership checks; user A can modify user B's resources
- **Authentication Bypass**: Missing or bypassable auth checks on endpoints
- **Authorization Bypass**: Role-based access control not enforced consistently
- **Sensitive Data Exposure**: PII, passwords, API keys in logs or responses
- **Insecure Deserialization**: Untrusted data deserialized without validation
- **Missing CORS Headers**: Overly permissive CORS or missing validation

### 3. Error Handling & Observability
- **Error Response Consistency**: All endpoints return same error shape with standardized codes
- **Meaningful Error Messages**: Client receives actionable guidance, not generic "Error"
- **Context in Errors**: Errors include resource IDs, operation type, user context for debugging
- **Swallowed Exceptions**: Catch blocks with no logging, empty bodies, or re-throw
- **Generic Catch-Alls**: Broad `catch (e: unknown)` without type guards
- **Logging Quality**: Logs are structured (JSON), contextual, not voluminous noise
- **Sensitive Data in Logs**: Passwords, tokens, PII accidentally logged
- **Stack Traces**: Production logs include stack traces without filtering sensitive frames

### 4. Test Coverage & Verification
- **Unit Test Coverage**: Have >80% coverage for business logic layers (services, repositories)
- **Happy Path Tests**: Typically tested, but are edge cases covered?
- **Error Path Tests**: Are all error codes, validation failures, and exception types tested?
- **Integration Tests**: Database interaction, external API calls, middleware chains tested?
- **E2E Tests**: Full request→response cycle for critical workflows?
- **Mock Management**: Are mocks/stubs realistic or hollow?
- **Flaky Tests**: Do tests pass/fail randomly due to timing, state, or ordering issues?
- **Test Isolation**: Do tests affect each other or require a specific run order?

### 5. Type Safety & Input Validation
- **Type Coverage**: Is codebase fully typed (no `any` or `unknown` escapes)?
- **Input Validation**: Does every boundary (HTTP, message queue, file import) validate schema?
- **Type Guards**: Are unions and optionals properly narrowed before use?
- **Zod Schema Completeness**: Do Zod schemas match database schema constraints?
- **Runtime Type Checks**: Are JSON casts verified or blindly trusted?
- **Missing Validations**: Are business rules (min/max, regex patterns, enum values) enforced?

### 6. Performance & Complexity
- **Algorithm Efficiency**: Are algorithms O(n) when they could be O(log n)?
- **Memory Leaks**: Are event listeners, timers, subscriptions properly cleaned up?
- **Unbounded Growth**: Are caches, queues, or in-memory collections capped?
- **Unnecessarily Complex**: Could the logic be simplified for clarity?
- **Dead Code**: Unreferenced functions, variables, or conditional branches?
- **Magic Numbers**: Constants that should be named or configurable

### 7. API Contract & Documentation
- **Response Schema Consistency**: Do individual and bulk endpoints return compatible shapes?
- **OpenAPI/Swagger Gaps**: Critical endpoints or error codes not documented?
- **API Versioning**: Version strategy clear? Backward compatibility maintained?
- **Pagination Contract**: Inconsistent pagination params across endpoints (skip vs offset vs cursor)?
- **Field Naming**: Inconsistent naming conventions (camelCase vs snake_case)?
- **Null Handling**: Are null responses vs empty arrays vs 404s used consistently?

## Review Methodology

### Step 1: Static Analysis Phase
1. Scan codebase for known anti-patterns (search for keywords)
2. Identify duplication via AST analysis
3. Extract metrics (file sizes, function lengths, cyclomatic complexity)
4. Catalog error types and exception flows

### Step 2: Cross-Layer Audit
1. **API Boundaries**: Inspect controllers for auth, validation, error handling
2. **Service Layer**: Check for business logic purity, transaction management, event emissions
3. **Data Layer**: Audit SQL queries, parameterization, index usage, N+1 patterns
4. **Shared Utilities**: Verify logging, caching, and utility functions are well-tested

### Step 3: Security Sweep
1. Search for SQL concatenation or template literals in queries
2. Check for auth/authz middleware on all protected endpoints
3. Verify parameterized queries and input validation schemas
4. Audit logs for sensitive data leaks
5. Review CORS, CSRF, and deserialization practices

### Step 4: Test Coverage Assessment
1. Identify critical paths (CRUD, bulk operations, auth flows)
2. Check for corresponding unit/integration/E2E tests
3. Review test quality (mock realism, isolation, determinism)
4. Flag untested error paths

### Step 5: Severity Ranking & Output
Categorize findings:
- **CRITICAL**: Security breach, data loss, production outage risk
- **HIGH**: Significant code smell or defect likely to cause issues
- **MEDIUM**: Technical debt or quality concern that impairs maintainability
- **LOW**: Style or minor efficiency issue
- **NITPICK**: Documentation or trivial cleanup

## Output Template

```
**[SEVERITY]** [Category] — [File(s)]:[Line(s)]

**Rule Violated**: [Which principle/best practice]
**Instances**: [Count and locations]
**Current Code**: [Snippet]
**Explanation**: [Why this is problematic]
**Risk**: [Concrete negative consequences]
**Recommendation**: [Specific fix, example code if applicable]
**Test Coverage Needed**: [What tests would validate the fix]
```

## Checklist: Common Anti-Patterns

- [ ] Functions that perform multiple responsibilities (parsing, validating, persisting, notifying)
- [ ] Error handling that logs and throws the same error (double reporting)
- [ ] Utility functions that aren't utility-like (too specific to one domain)
- [ ] Test files that duplicate application logic instead of isolating dependencies
- [ ] SQL queries built with string concatenation or template literals
- [ ] Controllers that directly query the database instead of using services
- [ ] Middleware applied globally when it should be selective
- [ ] Configuration that changes behavior without being externalized
- [ ] Cache invalidation logic spread across multiple files instead of centralized
- [ ] Event handlers that silently fail without logging
