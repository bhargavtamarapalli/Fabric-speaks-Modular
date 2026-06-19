# Code Review Skill

## Purpose
Conduct comprehensive code reviews with systematic analysis across multiple dimensions: security, performance, maintainability, and architectural quality.

## Core Review Framework

### 1. Security Audit
- **SQL Injection**: Check for parameterized queries, raw SQL construction, user input handling
- **Authentication/Authorization**: Verify role-based access control, permission checks, token validation
- **Data Protection**: Look for exposure of sensitive data in logs, responses, or error messages
- **Input Validation**: Trace all external inputs through sanitization pipelines
- **CSRF/CORS**: Verify security headers and cross-origin protections

### 2. Data Integrity & Business Logic
- **Type Safety**: Validate TypeScript types, null-safety, and type assertions
- **Constraint Enforcement**: Check database constraints, domain validations, and business rule enforcement
- **State Consistency**: Verify consistency across related entities and aggregate roots
- **Error Handling**: Audit exception handling, error recovery, and failure scenarios
- **Concurrency**: Identify race conditions, locking strategies, and atomic operation boundaries

### 3. Performance Analysis
- **Query Optimization**: Check for N+1 queries, missing indexes, inefficient pagination
- **Caching Strategy**: Validate cache-busting logic, TTL settings, eviction policies
- **Memory Efficiency**: Identify memory leaks, large object allocations, unnecessary array copies
- **Async Patterns**: Verify proper use of promises, async/await, and callback handling
- **Batch Processing**: Check chunk sizes, backpressure handling, and queue management

### 4. Code Quality Metrics
- **Duplication**: Flag copy-paste code, repeated patterns, shared utility opportunities
- **Complexity**: Identify god functions, deep nesting, cyclomatic complexity issues
- **Modularity**: Check single responsibility, tight coupling, loose cohesion
- **Testing**: Audit test coverage (unit, integration, e2e), edge case coverage
- **Documentation**: Verify API docs, code comments, and architectural clarity

### 5. Maintainability & Standards
- **Consistency**: Check naming conventions, code style, architectural patterns
- **Configuration**: Flag hardcoded values, magic numbers, environment-specific logic
- **Versioning**: Verify API versioning, backward compatibility, deprecation strategies
- **Logging**: Check structured logging, contextual information, log levels
- **Error Responses**: Validate standardized error shapes, error codes, actionable messages

## Severity Classification

- **Critical**: Security vulnerabilities, data loss risks, breaking compliance, production outages
- **High**: Significant performance degradation, concurrency bugs, transaction integrity issues
- **Medium**: Code smell, maintainability concerns, test gaps, missing edge case handling
- **Low**: Style inconsistencies, documentation gaps, minor inefficiencies
- **Nitpick**: Subjective improvements, minor naming tweaks, non-blocking suggestions

## Deliverable Format

```
## [Severity] [Category] - [Issue Title]

**File**: path/to/file.ts (Lines X-Y)
**Type**: [Security|Performance|Quality|Maintainability|DataIntegrity]

**Issue**:
[Clear explanation of the problem]

**Code Snippet**:
\`\`\`ts
[Offending code]
\`\`\`

**Impact**: [What goes wrong]

**Fix**:
\`\`\`ts
[Corrected code]
\`\`\`

**Validation**: [How to verify the fix]
```

## Walkthrough Checklist

- [ ] Search codebase for all CRUD endpoints
- [ ] Trace database query paths end-to-end
- [ ] Map transaction boundaries and atomic operations
- [ ] Audit permission checks before and after mutations
- [ ] Validate input sanitization and type safety
- [ ] Check error handling at every boundary
- [ ] Identify all edge cases and stress scenarios
- [ ] Verify cascade behavior for deletions
- [ ] Check concurrency control mechanisms
- [ ] Audit audit trail completeness
- [ ] Validate API response consistency
- [ ] Review test coverage and edge cases
- [ ] Flag hardcoded values and magic numbers
- [ ] Identify performance bottlenecks
- [ ] Check for missing rate limiting/quotas
