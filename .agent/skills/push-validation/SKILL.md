---
name: push-validation
description: Validates the codebase (TS, Lint, Build) and conducts a batch-wise review of uncommitted changes before pushing to the server.
---

# Pre-Push Validation & Review Skill

This skill MUST be triggered whenever the user asks to "push changes", "deploy to server", "commit and push after review", or explicitly asks to "review" uncommitted changes.

## REVIEW SEQUENCE (IF USER ASKS TO REVIEW)

If the user asks to "review" uncommitted changes, execute the following workflow. Note: these changes have not yet passed linting or typescript validation.

1. **Stage Changes:** Run `git add -A` to stage all uncommitted changes.
2. **Identify Files:** Run `git diff --name-only --cached` to list the staged files.
3. **Batch Plan:** Group the staged files into batches of 5. Create an implementation plan or artifact presenting these batches to the user.
4. **File-by-File Review:** Go through each file one by one in the current batch. Use `git diff --cached <file>` to review the specific changes. Present the review for the file, check for any obvious issues, and await user feedback or approval before moving to the next.

## VALIDATION STEPS (MANDATORY BEFORE PUSH)

Before triggering any push/sync command, you must execute and verify the following steps IN ORDER:

### 1. TypeScript Validation (Type Checking)
- **Command:** `npm run typecheck` from the root.
- **Success Criteria:** Zero errors in the output.
- **Action on Failure:** Stop immediately, report only the relevant TS errors, and ask the user to fix them.

### 2. Linting Validation
- **Command:** `npm run lint` from the root.
- **Success Criteria:** Zero linting errors (warnings may be reported but should not block if they are minor, unless critical).
- **Action on Failure:** Report the files with lint issues and offer to auto-fix them if possible (`npm run lint -- --fix`).

### 3. Compilation & Build Validation
- **Action:** Verify that all core workspaces compile successfully.
- **Commands:**
  1. `npm --workspace=shared run build`
  2. `npm --workspace=services/* run build` (or individually for modified services)
  3. `npm --workspace=apps/web run build` (only if frontend changes were made)
- **Success Criteria:** All build processes exit with code 0.

### 4. Push / Deployment
- **Only move to this step if all above checks pass.**
- **Action:** Sync changes using the appropriate version control command (e.g., `git push` or the project's custom sync tool).

## COMMUNICATION RULES
- Start by saying: "Initiating pre-push validation sequence..."
- Report status of each step (e.g., "✅ TypeScript checks passed", "⏳ Running linting...").
- If all checks pass, say: "🚀 All validations passed. Proceeding to push changes to the server."
- If any check fails, do NOT push. Provide a summary of failures.
