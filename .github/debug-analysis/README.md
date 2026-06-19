# Admin Flow Debug System

**Overview:** Automated analysis system for FabricSpeaks admin features. Find bugs, gaps, and improvement opportunities before they reach production.

---

## Quick Start

### For Users: How to Request Analysis

**In VS Code Chat, type:**
```
@admin flow debug: Debug Admin Product update flow
```

**Or:**
```
Debug Admin Order creation for edge cases
```

**Or for specific concerns:**
```
Check Admin Category deletion for cascade issues
```

**The agent will:**
1. ✅ Search project requirements and code
2. ✅ Map the complete flow step-by-step
3. ✅ Analyze all error scenarios
4. ✅ Find edge cases and gaps
5. ✅ Save results to `.github/debug-analysis/`
6. ✅ Provide concrete improvement recommendations

---

## What Gets Analyzed

### Stage 1: Basic Flow Analysis
- Route definition
- Controller entry point
- Service business logic
- Repository data layer
- Database operations
- Response formatting
- **Output:** Complete flow diagram with line numbers

### Stage 2: Error Handling Verification
- Input validation errors
- Missing resource (404)
- Permission denied (403)
- Validation failure (422)
- Conflict/race condition (409)
- Rate limit (429)
- Server errors (500)
- **Output:** Error scenarios matrix, gaps identified

### Stage 3: Edge Case Management
- Null/empty/boundary values
- Concurrent updates
- Permission changes mid-operation
- Large batch operations
- Database constraint violations
- Cache consistency
- Status transitions
- **Output:** Critical issues list with reproduction steps

---

## Features Covered

Admin features in scope for analysis:

| Feature | Status |
|---------|--------|
| Product Management | Ready for analysis |
| Order Management | Ready for analysis |
| User Management | Ready for analysis |
| Category Management | Ready for analysis |
| Inventory Management | Ready for analysis |
| Pricing Management | Ready for analysis |
| Permission Management | Ready for analysis |
| Batch Operations | Ready for analysis |

---

## How It Works: Behind the Scenes

### The Debug Agent Workflow

```
User Request: "Debug Admin Product update"
    ↓
1. Search Requirements
    ├─ Find design docs (HDD/LLD)
    ├─ Find API specifications  
    └─ Understand business rules
    ↓
2. Analyze Code Flow
    ├─ Trace routes → controllers → services → repositories
    ├─ Extract line numbers and file paths
    └─ Create flow diagram
    ↓
3. Error Handling Review
    ├─ Identify all possible errors
    ├─ Check for error handlers
    ├─ Verify error responses
    └─ Find gaps
    ↓
4. Edge Case Analysis
    ├─ Test boundary conditions
    ├─ Check concurrency handling
    ├─ Verify permission checks
    └─ Find risky scenarios
    ↓
5. Generate Report
    ├─ Create analysis file (.github/debug-analysis/[FEATURE]_analysis.md)
    ├─ Categorize findings by severity
    ├─ Provide code examples for fixes
    └─ Update INDEX.md
    ↓
Report Ready for Developer Review
```

### Analysis Saved For Future Reference

**Files Created:**
- `.github/debug-analysis/[FEATURE]_analysis.md` — Detailed analysis
- `.github/debug-analysis/INDEX.md` — Index of all analyses

**Why This Matters:**
- Track what's been analyzed
- Avoid duplicate analysis
- Historical reference for future work
- Identify patterns across features
- Build knowledge base

---

## Understanding the Results

### Severity Levels

| 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW |
|---|---|---|---|
| Must fix now | Fix soon | Fix later | Nice to have |
| Data loss risk | Important feature broken | Edge case | Minor improvement |
| Security issue | Very likely to occur | Might occur | Cleanup/optimization |
| System crash | Blocks workflow | Workaround exists | Polish only |

### Gap Categories

| Category | What It Means | Example |
|----------|--------------|---------|
| Missing validation | Input not checked | User sends negative quantity |
| Missing error handler | Exception not caught | Division by zero crashes |
| Race condition | Concurrent updates conflict | Two users update price simultaneously |
| Permission gap | Authorization not checked | User accesses other user's data |
| Edge case unhandled | Unusual but valid input | Empty list returns error instead of [] |
| Performance risk | Too slow or scales poorly | N+1 query problem |
| Cache issue | Stale data not refreshed | Delete cache not invalidated |

---

## Example Analysis

### Before (What You Have)
```
Product Update API exists - works fine
Code seems good - only a few error handlers
```

### After (What You Get)
```
CRITICAL GAPS FOUND:
1. Race condition: Two users updating price simultaneously causes lost update
   File: catalog.service.ts:245
   Fix: Add optimistic locking with version field

2. Missing validation: Negative quantity accepted
   File: catalog.controller.ts:120
   Fix: Add `if (quantity < 0) throw ValidationError`

3. Permission gap: User can update other user's prices
   File: catalog.service.ts:180
   Fix: Add permission check: `if (user.id !== product.ownerId) throw Forbidden`

4. Edge case: Zero-quantity batch causes 500 error
   File: catalog.repository.ts:350
   Fix: Add batch size validation before loop
```

---

## File Structure

```
.github/
├── agents/
│   └── debug-admin-flow.agent.md       ← This agent (configures its behavior)
│
└── debug-analysis/                     ← Analysis results stored here
    ├── INDEX.md                        ← Table of all analyses
    ├── TEMPLATE.md                     ← Template for new analyses
    ├── ProductManagement_analysis.md   ← Individual feature analyses
    ├── OrderManagement_analysis.md
    └── [FeatureName]_analysis.md
```

---

## Workflow Integration

### 1. New Feature: Request Analysis Early
```
Before Writing Code:
  Developer → "Debug Admin [New Feature] requirements"
  Agent → Maps what needs to be analyzed
  
During Development:
  Developer → "Debug Admin [Feature] - update progress"
  Agent → Checks gaps are being addressed
  
Before Code Review:
  Developer → "Debug Admin [Feature] - final check"
  Agent → Verifies quality gates met
```

### 2. Code Review: Reference Analysis
```
Reviewer finds issue → Check if it's in existing analysis
  Yes → Point to analysis document
  No → Request new analysis if pattern unclear
```

### 3. Production Review: Prevent Gaps
```
Before Deploy:
  Release Manager → "Verify Admin [Feature] passes analysis"
  Check: All CRITICAL issues fixed
  Check: All HIGH issues addressed  
  Deploy with confidence
```

### 4. Post-Deploy: Verify Fixes
```
After Deploy:
  Monitor Sentry for errors
  If gap recurs → Request re-analysis
  Update analysis with actual findings
  Improve detection for next time
```

---

## Common Questions

### "Should I request analysis for every small change?"
No. Use analysis for:
- ✅ New endpoints/features
- ✅ Major refactors
- ✅ Before production release
- ✅ After finding a bug
- ❌ Not for: Typo fixes, variable renames, comment tweaks

### "How long does analysis take?"
- Simple flow: 5-15 minutes
- Complex with many endpoints: 15-30 minutes
- Includes saving results for future reference

### "Can I dispute the findings?"
Yes! If you believe a finding is:
- Wrong context (different flow analyzed by mistake)
- Already fixed (analysis outdated)
- Invalid (not actually a problem)

Request re-analysis with your context and the agent will reconsider.

### "How do I implement the fixes?"
Each analysis includes:
- Specific code examples
- Exact file paths and line numbers
- Recommended approaches
- Test cases to verify fix

### "Can I reuse analysis for similar features?"
Partially. Each feature has unique:
- Permission rules
- Validation logic
- Concurrency patterns
- Error handling

Use analysis for patterns, but don't blindly copy-paste without understanding your feature's specifics.

---

## Tips for Best Results

### Request Clear Feature Names
```
❌ "Debug the update flow"
✅ "Debug Admin Product update flow"
✅ "Debug Admin Order status transition"
```

### Add Context When Needed
```
"Debug Admin Product bulk update - especially looking for race conditions"
"Check User permission assignment for cascade effects"
"Find edge cases in Category deletion"
```

### Reference Updates
```
After fixing issues: "Re-analyze Admin Product flow - verify fixes for [CRITICAL-1, CRITICAL-2]"
After requirement change: "Re-analyze with updated spec for bulk limits"
```

---

## Development Tips

### Use Analysis Results in Code
```typescript
// ✅ Good: Reference analysis finding in comment
// See: .github/debug-analysis/ProductManagement_analysis.md
// CRITICAL-1: Race condition fixed by adding optimistic locking

export function updateProductPrice(id, version, newPrice) {
  // This includes version check to prevent lost updates
  // as identified in analysis
  const result = await db.query(
    'UPDATE products SET price = $1, version = version + 1 
     WHERE id = $2 AND version = $3'
  );
}
```

### Test Against Edge Cases
```typescript
// Use edge cases from analysis as test cases
describe('Admin Product Update', () => {
  test('handles null quantity (EDGE-CASE-1 from analysis)', () => {
    expect(() => updateProduct(id, { quantity: null }))
      .toThrow(ValidationError);
  });

  test('handles concurrent updates (CRITICAL-1 from analysis)', async () => {
    // Optimistic locking test
  });
});
```

### Link Analysis to Tickets
```
Jira/GitHub Ticket:
  Title: "Fix Admin Product race condition - CRITICAL-1"
  Description: "See analysis: .github/debug-analysis/ProductManagement_analysis.md"
  Impact: "Lost updates when multiple users edit price"
  Fix: "Add version field + optimistic locking"
```

---

## Next Steps

1. **Try It Out:**
   ```
   Message: "Debug Admin Product update flow"
   Or: "@admin flow debug: Check Product management"
   ```

2. **Read Results:**
   - Check `.github/debug-analysis/ProductManagement_analysis.md`
   - Review findings by severity
   - Understand each gap

3. **Implement Fixes:**
   - Create tickets for CRITICAL and HIGH issues
   - Reference code examples in analysis
   - Add tests for edge cases

4. **Track Progress:**
   - Index.md shows which features analyzed
   - Check status of each analysis
   - Re-analyze after major changes

---

## Support

**Questions about a specific analysis?**
- Read the feature's `.../[FEATURE]_analysis.md` file
- Check TEMPLATE.md for field meanings

**Want to request analysis?**
- Type in chat: "Debug Admin [Feature Name] flow"
- Be specific about the feature

**Found a bug the analysis missed?**
- Request re-analysis with new context
- Agent will investigate and update findings

**Want to improve the agent?**
- Feedback on accuracy and usefulness
- Suggest new edge cases to check
- Request analysis of new features

---

*Created: 2026-04-07*  
*By: Agent Customization System*  
*For: FabricSpeaks Admin Features Debug*
