---
description: Instructs the AI on how to systematically solve bugs in this repository.
---
# Bug Fix Skills

When assessing and fixing bugs in this codebase, adhere to the following systematic approach:

## 1. Isolate the Problem
- Identify the subsystem where the failure occurs (e.g., API gateway, database transaction, background job).
- Analyze exact error logs and stack traces before concluding. Do not guess.

## 2. Trace the Data Flow
- If dealing with invalid data, locate where the data was generated or last validated.
- Ensure that validation boundaries (e.g., Zod schemas) are not being bypassed.

## 3. Concurrency and Race Conditions
- If the bug is intermittent or related to counts (inventory, pricing), immediately check for transaction atomicity. 
- Look for pessimistic locking (`FOR UPDATE`) or serializable transaction isolation requirements that might be missing.

## 4. Test Before Fix
- Identify a deterministic way to reproduce the issue.
- Verify whether the issue is solved after the patch without breaking existing tests.

## 5. Clean Fixes
- Fix the root cause, not just the symptom. Avoid using `ts-ignore` to suppress compiling errors.
- Ensure the fix logs necessary audit actions if modifying restricted entity states (like products, users, inventory).
