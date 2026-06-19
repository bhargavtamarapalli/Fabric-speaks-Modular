# Quick Reference: Using the Admin Flow Debugger

## One-Minute Setup

1. **Agent is ready:** `.github/agents/debug-admin-flow.agent.md`
2. **Analysis storage:** `.github/debug-analysis/`
3. **Analysis index:** `.github/debug-analysis/INDEX.md`

## Using It: Copy-Paste Examples

### Request Analysis
```
Message to AI: Debug Admin Product update flow
Message to AI: Check Admin Order creation for edge cases  
Message to AI: Find gaps in Admin User permission assignment
```

### What You Get Back
- ✅ Complete flow diagram (request → response)
- ✅ All error scenarios documented
- ✅ Edge cases identified by severity
- ✅ Code examples showing fixes
- ✅ Results saved to `.github/debug-analysis/[FEATURE]_analysis.md`

### Check Previous Analyses
- Open `.github/debug-analysis/INDEX.md`
- See which features already analyzed
- Click link to read analysis
- Reference when implementing fixes

---

## The Three-Stage Analysis

### Stage 1: Flow Trace
```
Request → Route → Controller → Service → Repository → Database → Response
```
**What:** Shows exact files and line numbers  
**Why:** Understand the complete path data takes  
**Output:** Flow map with line references

### Stage 2: Error Handling  
```
For every error that can happen:
  - Can it occur? WHERE?
  - Is it caught? HOW?
  - Does client know? WHAT MESSAGE?
  - Is it logged? MONITORED?
```
**Output:** Table of all error scenarios + gaps

### Stage 3: Edge Cases
```
What breaks the happy path?
- NULL values
- Empty lists
- Maximum values
- Concurrent updates
- Permission changes
- Large batches
- Database constraints
```
**Output:** Critical bugs found + code fixes

---

## Results Interpretation

### Severity Badges

| 🔴 CRITICAL | ⚠️ Must fix before release |
| 🟠 HIGH | ⚠️ Fix in next sprint |
| 🟡 MEDIUM | Consider for future |
| 🟢 LOW | Nice to have |

### Status Indicators

| ✅ PASS | No issues found |
| ⚠️ GAP | Issue identified + fix provided |
| ❌ FAIL | Critical issue, block release |

---

## Examples of Gaps Found

### Gap Type: Missing Validation
```
❌ Problem: Code accepts negative quantities
✅ Fix: Add validation before creating product
   if (quantity < 0) throw ValidationError('Quantity must be positive')
```

### Gap Type: Race Condition
```
❌ Problem: Two users updating price simultaneously lose one update
✅ Fix: Add optimistic locking with version field
   WHERE id = $1 AND version = $2  
   SET version = version + 1
```

### Gap Type: Permission N't Checked
```
❌ Problem: User can update another user's product
✅ Fix: Add permission check
   if (product.ownerId !== userId) throw Forbidden('No permission')
```

### Gap Type: Edge Case Not Handled
```
❌ Problem: Empty batch causes 500 error
✅ Fix: Validate batch before processing
   if (items.length === 0) return { count: 0 }
```

---

## Workflow Integration

### Before You Code
```
1. Request analysis: "Debug Admin [Feature] requirements"
2. Read analysis: Check `.github/debug-analysis/INDEX.md`
3. Design around known gaps
```

### While You Code
```
1. Reference analysis findings in comments
2. Implement fixes for identified gaps
3. Add tests for edge cases from analysis
```

### Before Code Review
```
1. Check: "Debug Admin [Feature] - final check"
2. Ensure all gaps addressed
3. Share analysis with reviewer
```

### Before Production
```
1. Verify: All CRITICAL issues fixed
2. Check: All HIGH issues addressed
3. Reference analysis in release notes
4. Deploy with confidence
```

---

## File Organization Quick Map

```
.github/
│
├── agents/
│   └── debug-admin-flow.agent.md          ← The debug agent itself
│
└── debug-analysis/
    ├── README.md                           ← Full guide (you're reading this)
    ├── INDEX.md                            ← List of all analyses
    ├── TEMPLATE.md                         ← Template for new analyses
    │
    └── [Feature]_analysis.md files:
        ├── ProductManagement_analysis.md
        ├── OrderManagement_analysis.md
        ├── UserManagement_analysis.md
        └── [etc...]
```

---

## Common Requests & Responses

### Request
```
"Debug Admin Product update flow"
```
**Response:** Complete analysis saved to `ProductManagement_analysis.md`

### Request
```
"Check Admin Order creation for edge cases"
```
**Response:** Focus on edge cases, saved to `OrderManagement_analysis.md`

### Request
```
"Find gaps in Admin User permission assignment"
```
**Response:** Permission-focused analysis, saved to `UserManagement_analysis.md`

### Request
```
"Re-analyze Admin Product flow - updated requirements"
```
**Response:** New analysis created, previous version preserved

---

## Checklist: Before You Deploy

- [ ] Requested analysis: "Debug Admin [Feature] flow"
- [ ] Received comprehensive analysis
- [ ] Read the full analysis file
- [ ] All 🔴 CRITICAL issues fixed
- [ ] All 🟠 HIGH issues addressed
- [ ] Added tests from edge case list
- [ ] Code references analysis file
- [ ] Shared analysis with team
- [ ] Ready to deploy

---

## Key Terms Explained

| Term | Meaning |
|------|---------|
| **Flow** | Complete path from API request to database and back |
| **Gap** | Missing error handling, validation, or edge case |
| **Race Condition** | Two users update same thing simultaneously |
| **Optimistic Locking** | Use version field to detect conflicts |
| **SERIALIZABLE** | Isolation level preventing concurrent update issues |
| **Cascade** | Delete parent → children auto-delete |
| **Idempotency** | Same request twice = same result |

---

## Tips for Best Results

✅ **DO:**
- Request analysis by feature name: "Debug Admin Product management"
- Add context: "Especially looking for race conditions"
- Re-analyze when requirements change
- Share analysis with team
- Reference analysis when implementing fixes
- Test edge cases from analysis

❌ **DON'T:**
- Ask vague questions: "Debug the flow" ← Unclear which feature
- Ignore CRITICAL findings
- Assume analysis covers new code (things change)
- Skip edge case tests

---

## Next Steps

1. **Try it now:**
   ```
   Message: "Debug Admin Product update flow"
   ```

2. **View results:**
   ```
   Open: .github/debug-analysis/ProductManagement_analysis.md
   ```

3. **Check status:**
   ```
   Open: .github/debug-analysis/INDEX.md
   ```

4. **Implement fixes:**
   ```
   Create tickets for CRITICAL and HIGH issues
   Reference analysis file in ticket description
   ```

---

**Ready?** Message: `Debug Admin Product update flow`

*Framework last updated: 2026-04-07*
