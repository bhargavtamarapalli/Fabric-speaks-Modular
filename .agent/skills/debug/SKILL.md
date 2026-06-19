# Debug Skill

## Purpose
Systematically debug complex issues through methodical code tracing, runtime analysis, and root cause identification.

## Debugging Framework

### Phase 1: Issue Reproduction
- Identify clear reproduction steps or error messages
- Locate the first point where expected behavior diverges from actual behavior
- Gather console logs, network traces, database queries, stack traces
- Note when the issue started (regression detection)

### Phase 2: Code Tracing
- **Forward Tracing**: Follow execution flow from entry point to failure
- **Backward Tracing**: Start from error site and work backward to root cause
- **Cross-Layer Tracing**: Track data flow across UI → API → Service → Database layers
- **State Inspection**: Check variable values, types, and mutations at each step
- **Async Tracing**: Map promise chains, event handlers, callback sequences

### Phase 3: Root Cause Analysis
- **Single Cause Hypothesis**: Is there one root cause or multiple contributing factors?
- **Temporal Analysis**: Is timing a factor (race conditions, timeout windows)?
- **Configuration Issues**: Are environment variables, settings, or database state causing it?
- **Dependency Analysis**: Which external services or libraries are involved?
- **Recent Changes**: What changed in code, schema, or environment recently?

### Phase 4: Validation & Reproduction at Scale
- Create minimal reproducible test case
- Test fix in isolated environment
- Verify no side effects on related functionality
- Stress-test with boundary conditions (null, empty, large payloads)
- Performance profile before/after fix

## Investigation Techniques

### Database Diagnostics
- Run raw queries to inspect data state
- Check constraint violations, orphaned records
- Verify indexes and query execution plans
- Trace transaction isolation issues
- Audit permission/role data consistency

### API Tracing
- Inspect request/response payloads
- Check status codes and error responses
- Map endpoint to controller to service logic
- Validate input transformation and output serialization
- Trace middleware execution order

### Concurrency Debugging
- Identify critical sections where race conditions can occur
- Check lock acquisition/release timing
- Trace optimistic/pessimistic locking semantics
- Verify transaction ACID properties
- Identify deadlock scenarios

### Performance Analysis
- Measure query execution times
- Count database round-trips (N+1 detection)
- Profile CPU and memory usage
- Check for inefficient loops and algorithms
- Trace cache hit rates

## Common Bug Patterns

### Data Layer
- Missing null coalescing: `field || defaultValue` vs `field ?? defaultValue`
- Type mismatches: String ID vs Number ID, Date serialization
- Constraint violations: Foreign key violations, unique constraint duplicates
- Stale cache data: Cache not invalidated on mutations
- Timezone/timestamp issues: UTC vs local time confusion

### Business Logic
- Off-by-one errors: `<` vs `<=` in comparisons
- Double processing: Idempotency violations, retry vulnerabilities
- Partial rollback: One step succeeds, next fails, no cleanup
- Missing validation: Assuming input matches schema
- Permission leaks: Missing authorization checks

### Async/Concurrency
- Race conditions: Multiple requests updating same resource
- Unhandled promise rejections
- Callback hell: Nested promises without proper chaining
- Request ordering: Assuming responses arrive in request order
- Resource contention: Locks held too long

## Deliverable Format

```
## [Issue] - [Root Cause]

**Symptom**: [What the user/system observes]

**Affected File(s)**: path/to/file.ts (Lines X-Y)

**Trace Path**:
1. Entry point: [API endpoint/function called]
2. [Intermediate function/query]
3. [Database operation]
4. [Response transformation]
5. Failure point: [Where expectation diverges]

**Root Cause**:
[Clear explanation of why the bug occurs]

**Code Snippet**:
\`\`\`ts
// Buggy code
[Problematic implementation]
\`\`\`

**Why It Fails**:
[Detailed analysis of the failure]

**Fix**:
\`\`\`ts
// Corrected code
[Fixed implementation]
\`\`\`

**Validation Steps**:
- [ ] [Test scenario 1]
- [ ] [Test scenario 2]
- [ ] [Edge case coverage]
```

## Investigation Checklist

- [ ] Gather all error logs and stack traces
- [ ] Identify first symptom appearance point
- [ ] Map code flow from entry to failure
- [ ] Check recent commits and deployments
- [ ] Verify configuration and environment variables
- [ ] Inspect database state and constraints
- [ ] Check external service status
- [ ] Profile performance metrics
- [ ] Test with boundary inputs
- [ ] Verify no other instances of same bug
- [ ] Create automated regression test
- [ ] Document fix and preventive measures
