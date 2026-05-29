# 🚀 Quick Start Guide: Admin Flow Debugger

## Created For You

**Purpose:** A specialized AI agent that debugs your admin flows step-by-step

**Covers:** Admin Product, Order, User, Category, Inventory, Pricing, Permissions management

**Analyzes:** Basic flow → Error handling → Edge cases

---

## How to Use (30 seconds)

### Step 1: Open VS Code Chat
Type any of these:

```bash
Debug Admin Product update flow

Check Admin Order creation for edge cases

Find gaps in Admin User permission assignment

Debug Admin Category deletion for cascade issues
```

### Step 2: Wait for Analysis
Agent will:
- Search project docs
- Analyze code flow
- Check error handling
- Find edge cases
- Save results

### Step 3: Read Results
Open: `.github/debug-analysis/[FEATURE]_analysis.md`

View:
- 🟢 Complete code flow with line numbers
- 🔴 Critical bugs found
- 🟠 Important improvements needed
- 📝 Code examples for fixes

---

## File Structure Created

```
.github/
├── agents/
│   └── debug-admin-flow.agent.md         ← The agent
│
└── debug-analysis/                       ← All analyses go here
    ├── INDEX.md                          ← Track what's analyzed
    ├── README.md                         ← Full guide
    ├── QUICKREF.md                       ← One-page reference
    ├── TEMPLATE.md                       ← Analysis template
    │
    └── [Feature]_analysis.md             ← Individual analyses
        ├── ProductManagement_analysis.md     (auto-created when you request)
        ├── OrderManagement_analysis.md       (auto-created when you request)
        └── etc...
```

---

## What You'll Get Back

Example analysis for "Debug Admin Product update flow":

### Section 1: Flow Map
```
Request comes in
  ↓
routes/product.routes.ts (line 45)
  ↓
controllers/product.controller.ts (line 120)
  ↓
services/product.service.ts (line 180)
  ↓
repositories/product.repository.ts (line 250)
  ↓
Database UPDATE query
  ↓
Response sent back
```

### Section 2: Error Handling Check
| Error | Location | Status |
|-------|----------|--------|
| Invalid input | controller:130 | ✅ Handled |
| User lacks permission | service:200 | ❌ **MISSING** |
| Race condition on update | service:210 | ❌ **CRITICAL** |

### Section 3: Edge Cases
- 🔴 **CRITICAL-1:** Simultaneous updates lose data
  - **How to fix:** Add version field + optimistic locking
  - **Code:** [Example provided]
  
- 🟠 **HIGH-1:** User can update other users' products
  - **How to fix:** Add permission check
  - **Code:** [Example provided]

---

## Three Analysis Stages Explained

### Stage 1: Basic Flow
"Show me the complete path from API call to database and back"
- Maps every file touched
- Shows line numbers
- Identifies data transformations

### Stage 2: Error Handling
"What happens when things go wrong?"
- Catches all error types
- Checks if they're handled
- Identifies missing handlers

### Stage 3: Edge Cases
"Where might this code break?"
- Null/empty values
- Very large values
- Concurrent access
- Permission changes
- Database constraints

---

## Common Findings Explained

### Gap Type: Missing Validation
```
❌ CODE ACCEPTS: quantity = -100
✅ SHOULD: Reject negative quantities
✅ FIX: Add validation before database
```

### Gap Type: Race Condition
```
❌ PROBLEM: 
   User A updates price to 100
   User B updates price to 90
   Result: One update lost! 😱

✅ FIX: Use version field
   WHERE id = 123 AND version = 5
   SET version = 6, price = 100
   If version doesn't match → conflict!
```

### Gap Type: Permission Not Checked
```
❌ BUG: User can update another user's data
✅ FIX: Add check
   if (product.ownerId !== currentUser.id) throw Forbidden
```

---

## Usage Examples

### Request 1: Complete Flow Analysis
```
User: "Debug Admin Product update flow"

Agent will find:
✅ Complete flow path
✅ What errors can happen
✅ Where things might break
✅ Code fixes for all issues

Result: ProductManagement_analysis.md saved
```

### Request 2: Focused Analysis
```
User: "Check Admin Order for race conditions"

Agent will focus on:
✅ Concurrent update scenarios
✅ Transaction isolation
✅ Potential lost updates
✅ Fixes for concurrency issues

Result: OrderManagement_analysis.md saved
```

### Request 3: Re-analyze After Changes
```
User: "Re-analyze Admin Product - requirements updated for batch size 500"

Agent will:
✅ Re-run full analysis
✅ Check new requirements
✅ Find new gaps
✅ Update analysis file

Result: ProductManagement_analysis.md updated
```

---

## Workflow Integration

### For Developers

**Before coding:**
```
Message: "Debug Admin [Feature] flow"
Read the analysis
Code with gaps in mind
```

**During coding:**
```
Reference analysis in comments
Implement gap fixes
Add tests for edge cases
```

**Code review:**
```
Share analysis with reviewer
Link to analysis in PR
Verify all gaps addressed
```

**Before production:**
```
Message: "Verify Admin [Feature] pre-deploy"
Check: All CRITICAL issues fixed? ✅
Deploy!
```

### For Team

**Planning sprint:**
```
Check: What features need analysis?
Analysis reveals priority fixes
Plan sprint around critical gaps
```

**Code review checklist:**
```
Message: "Any known gaps in this code?"
Check INDEX.md
Reference analysis in review
Ask: Were gaps addressed?
```

**Post-deploy:**
```
Monitor errors in Sentry
If new gap found: Re-analyze
Compare to previous analysis
Improve for next time
```

---

## Severity Levels Quick Guide

| 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW |
|---|---|---|---|
| **Fix NOW** | **Fix Soon** | **Fix Later** | **Nice to have** |
| Data loss risk | Important broken | Edge case | Polish |
| Security issue | Feature broken | Workaround exists | Improvement |
| System crash | Blocks workflow | Might occur | Clean up |
| **Block deploy** | **Next sprint** | **Consider** | **Backlog** |

---

## What's Tracked Automatically

Open `.github/debug-analysis/INDEX.md` to see:

```
Feature                  Status          Date        Critical Issues
─────────────────────────────────────────────────────────────────
Product Management       ⏳ Pending       -           -
Order Management         ⏳ Pending       -           -
User Management          ⏳ Pending       -           -
Category Management      ⏳ Pending       -           -
```

When you request analysis, it updates automatically:
```
Product Management       ✅ Complete     2026-04-07  2 CRITICAL, 3 HIGH
```

---

## Pro Tips

### Tip 1: Reference in Your Code
```typescript
// See: .github/debug-analysis/ProductManagement_analysis.md - CRITICAL-1
// Added optimistic locking to prevent lost updates
export function updateProduct(id, version, data) {
  // Including version check...
}
```

### Tip 2: Link to Issues
```
Jira Ticket: "Fix Admin Product race condition"
Description: "See analysis: .github/debug-analysis/ProductManagement_analysis.md"
Priority: CRITICAL (blocks production)
```

### Tip 3: Test Edge Cases
```typescript
test('handles negative quantity', () => {
  expect(() => updateProduct(id, { quantity: -1 }))
    .toThrow(ValidationError);
  // From edge case: BOUNDARY-1 in analysis
});
```

### Tip 4: Share with Team
```
Code Review Comment:
"Please check .github/debug-analysis/ProductManagement_analysis.md
Specifically, did we address HIGH-1 (permission check)?"
```

---

## Troubleshooting

### "How do I know which flow to debug?"
Start with your most critical features:
- Product Management (core business)
- Order Management (revenue)
- User Management (security)
- Category Management (structure)

### "Analysis seems wrong?"
Request re-analysis with context:
```
"Re-analyze Admin Product - the race condition issue we already fixed"
```

### "I see old analysis - is it still valid?"
If requirements haven't changed: Yes, it's still valid!
If requirements changed: Request re-analysis
```
"Re-analyze Admin Product with new bulk-size limits"
```

### "Do I need to analyze everything?"
No! Prioritize:
1. New features (always analyze)
2. Critical flows (quarterly)
3. Before production (required)
4. After bugs (find similar issues)

---

## Next Steps

### Right Now (5 minutes)
1. Open VS Code Chat
2. Type: `Debug Admin Product update flow`
3. Wait for analysis
4. Open generated file

### This Week
- Analyze your 3-4 most critical admin flows
- Team reviews analyses
- Create tickets for critical fixes

### This Month
- Implement fixes for critical gaps
- Add tests for edge cases
- Deploy with confidence

### Ongoing
- Use framework for design reviews
- Reference framework in code  
- Re-analyze when requirements change
- Build knowledge of patterns

---

## Quick Reference Commands

```bash
# Start complete analysis
"Debug Admin [FeatureName] flow"

# Focus on specific concern
"Check Admin [Feature] for race conditions"
"Find permission gaps in Admin [Feature]"
"Analyze Admin [Feature] error handling"

# Re-analyze after changes
"Re-analyze Admin [Feature] - requirements updated"

# Check what's been analyzed
Open: .github/debug-analysis/INDEX.md

# View specific analysis
Open: .github/debug-analysis/[FeatureName]_analysis.md

# Quick reference
Open: .github/debug-analysis/QUICKREF.md

# Full guide
Open: .github/debug-analysis/README.md
```

---

## One-Minute Checklist Before Deploy

- [ ] Feature has been analyzed? (✅ or request: "Debug Admin [Feature]")
- [ ] All 🔴 CRITICAL issues fixed? (✅)
- [ ] All 🟠 HIGH issues addressed? (✅)
- [ ] Tests added for edge cases? (✅)
- [ ] Analysis referenced in code/tickets? (✅)
- [ ] Team reviewed analysis? (✅)
- [ ] Ready to deploy? (✅ YES GO!)

---

**Ready to try it?**

Open VS Code Chat and type:
```
Debug Admin Product update flow
```

Then read the analysis in:
```
.github/debug-analysis/ProductManagement_analysis.md
```

Enjoy! 🚀

---

*Setup Complete: 2026-04-07*  
*For: FabricSpeaks Admin Flows*  
*Status: Ready to Use*
