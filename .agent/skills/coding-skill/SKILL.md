# Coding Skill

Use this for production-ready implementation.

Principles:
- SOLID: single responsibility functions, explicit interfaces, dependency boundaries.
- Reuse: central API client wrappers, shared UI atoms, generic helpers/hooks.
- Performance: avoid unnecessary rerenders, memoize derived data, avoid duplicate network calls.
- Safety: typed DTOs, no silent failure, map backend errors to user-readable toasts.
- UX: handle loading/error/empty/populated states and destructive confirmation.

Checklist:
1. Define/confirm API contracts first.
2. Add/adjust central typed API functions.
3. Build reusable UI components or hooks for repeated logic.
4. Keep side effects isolated and abort-safe.
5. Validate with tsc + lint on touched files.
