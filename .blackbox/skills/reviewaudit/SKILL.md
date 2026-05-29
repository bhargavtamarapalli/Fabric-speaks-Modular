---
name: reviewaudit
description: Systematic review of repository changes, PRs, branch diffs, and commits across security, architecture, data integrity, performance, quality, and git best practices. Use for PR reviews, branch audits, change validation.
---

# Reviewaudit Skill

Conduct comprehensive reviews of repository changes using systematic framework.

## Core Review Framework

### 1. Git & Change Analysis
- **Commit Quality**: Conventional commits, atomic changes, descriptive messages
- **Diff Scope**: Single responsibility changes, no mixed concerns
- **Branch Strategy**: Feature branch naming, PR size, rebase vs merge
- **Change Impact**: Files affected, dependencies touched, test coverage delta
- **Deprecation Handling**: Removed code cleanup, migration paths

### 2. Security Audit
- **SQL Injection**: Parameterized queries in new/changed code, raw SQL
- **Authentication/Authorization**: New role checks, permission changes
- **Data Protection**: Sensitive data handling in diffs
- **Input Validation**: Sanitization in updated paths
- **Secrets**: No accidental commits (git log -- .env*)

### 3. Data Integrity & Business Logic
- **Type Safety**: TS changes, null-safety in diffs
- **Constraint Enforcement**: DB migration safety, validations
- **State Consistency**: Aggregate roots affected by changes
- **Concurrency**: New locking/race fixes
- **Error Handling**: Updated exception paths

### 4. Performance Analysis
- **Query Optimization**: N+1 in changed queries, new indexes
- **Caching**: Cache logic updates
- **Memory**: Large allocations in new code
- **Async**: Promise handling in changes

### 5. Code Quality Metrics
- **Duplication**: Reduced in refactors
- **Complexity**: God functions split
- **Modularity**: SRP adherence
- **Testing**: New tests for changes, coverage delta
- **Documentation**: Updated comments/docs

### 6. Maintainability & Standards
- **Consistency**: Coding standards match
- **Configuration**: No hardcodes in new code
- **Versioning**: BC preserved
- **Logging**: Structured in changes

## Severity Classification

- **Critical**: Security vulns, data loss, production outages, git history pollution
- **High**: Performance regressions, concurrency bugs, BC breaks
- **Medium**: Code smells, test gaps, migration risks
- **Low**: Style issues, doc gaps
- **Nitpick**: Minor suggestions

## Deliverable Format

```
## [Severity] [Category] - [Issue Title]

**Commit/PR**: hash/title (Files: list)
**Files**: path/to/changed.ts (Lines +X -Y)

**Issue**:
[Explanation]

**Diff Snippet**:
```diff
[git diff excerpt]
```

**Impact**: [consequences]

**Fix**:
```diff
[suggested diff]
```

**Validation**: [tests/commands to verify]
```

## Walkthrough Checklist

- [ ] `git diff --stat` scope analysis
- [ ] Commit message conventionality
- [ ] All files changed reviewed
- [ ] Security changes traced
- [ ] DB migrations safe/rollbackable
- [ ] Tests cover new paths
- [ ] Performance before/after
- [ ] BC preserved
- [ ] Docs updated
- [ ] Coverage delta positive

## Examples

### Example 1: PR Review
**Input**: "Review PR #123 adding new admin endpoint"

**Analysis**:
- Git: Good commit messages, small PR
- Security: Missing role check [Critical]
- etc.

### Example 2: Branch Diff
**Input**: "Audit main..feature-branch"

**Analysis**:
- Large refactor, good tests added
- Performance: New index [+]
- Nit: Minor naming

Ready for use in code review workflows.

