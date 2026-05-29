---
description: Instructs the AI on proper coding practices for this repository.
---
# Coding Skills

When generating or modifying code in this repository, always adhere to the following guidelines:

## 1. Modularity
- Keep functions and methods small and focused on a single responsibility.
- Use dependency injection where applicable (especially in the service layer).
- Avoid monolithic files; separate concerns into repositories, services, and controllers/resolvers.

## 2. Strong Typing (TypeScript)
- Always use explicit types for function parameters and return types.
- Avoid using `any`; define robust interfaces or use `unknown` if necessary.
- Leverage Zod schemas for runtime validation of incoming payloads before they reach the service layer.

## 3. Error Handling
- Never swallow errors silently. Use custom error classes (e.g., `AppError` with `ErrorCode`) to standardize API responses.
- If catching an error, either handle it explicitly or wrap and rethrow it with additional context.

## 4. Documentation
- Document complex logic using JSDoc.
- Focus code comments on *why* something is done, rather than *what* is done.

## 5. Security & Consistency
- Sanitize inputs to avoid injection attacks. 
- Follow the established naming conventions (camelCase for variables, PascalCase for classes/interfaces).
- Keep SQL queries parameterized to prevent SQL injection.
