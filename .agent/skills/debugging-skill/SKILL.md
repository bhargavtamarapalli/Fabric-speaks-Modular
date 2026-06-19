# Debugging Skill

Use this when a feature is broken in UI/API integration.

1. Classify failure first: render, data, interaction, navigation, style, performance.
2. Gather evidence before edits: exact error, route, request URL, status code, payload, response.
3. Verify contract: frontend endpoint/path, method, payload keys, required fields, auth role.
4. Patch one root cause at a time and retest.
5. Add guardrails: loading/error/empty states, retry, defensive parsing.
6. Verify with:
   - local typecheck
   - local lint on touched files
   - manual happy-path and one failure-path
7. Record residual risks and required services/env vars.
