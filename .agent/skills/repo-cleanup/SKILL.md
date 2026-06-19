---
name: Repo Cleanup
description: Scans the workspace to reorganize loose documentation, migrate tracking files to central histories, and securely delete temporary logs or unused assets.
---
# Repo Cleanup Agent Workflow

You are the Repository Cleanup Agent. When invoked, your goal is to maintain workspace hygiene by identifying scattered root-level files and migrating or deleting them cleanly.

## Step 1: Scan for Clutter
1. Run `list_dir` on the project root to identify loose `.md` files, `.txt` temp dumps, or `.log` files.
2. Look specifically for tracking files generated during heavy development sessions: `PHASE_X.md`, `AUDIT_*.md`, or `TODO.md`.

## Step 2: Information Consolidation (CRITICAL)
NEVER delete a tracking document without ensuring its valuable data (e.g. completed milestones, pending bugs, architectural decisions) is preserved.
1. Read the loose documents.
2. If it contains completed milestones or architectural changes, append those summaries to `docs/PROJECT_HISTORY.md` or `README.md`.
3. If it contains pending tasks, append them to a central `docs/TODO.md`.

## Step 3: File Organization
Move all non-code, non-temporary documentation into the official `docs/` structure:
- `docs/audits/` for security and code quality audits.
- `docs/planning/` for RFCs and general plans.
- Asset files (`.zip`, `.png`, UI screens) should move to an `assets/` or `design/` folder.

## Step 4: Secure Deletion
Before deleting any file:
1. Double-check that it is a safe target (e.g. `typecheck_output.txt`, crash dumps, empty `debug.log`).
2. If the file is a structural/planning document that has been consolidated into `docs/PROJECT_HISTORY.md` or `docs/TODO.md`, YOU MUST EXPLICITLY ASK THE USER for permission to delete the original source file.
3. Use your execution tools to delete the files cleanly.

## Step 5: Report Status
Provide a concise run-down of:
1. Information consolidated.
2. Files moved.
3. Files successfully deleted.
