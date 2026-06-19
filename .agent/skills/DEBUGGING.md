---
name: Infrastructure & connectivity debugging
description: Systematically diagnose and resolve gateway 503s, 404s, role-based access failures, and data visibility issues in the Fabric Speaks monorepo.
---

# Infrastructure & Connectivity Debugging Skill

This skill provides a structured methodology for diagnosing and resolving persistent connectivity or data visibility issues (e.g., "503 Service Unavailable," "No brands found," or "Service Offline" states).

## 1. Gateway Infrastructure Check
**Trigger:** 503 errors, 404 on API endpoints, or services showing "Offline" in the dashboard.

1.  **Verify Gateway PID**: Check if the local gateway is running on port 4000.
    ```powershell
    Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object OwningProcess
    ```
2.  **Restart if necessary**: If port 4000 is not bound, or if routing is broken:
    - Locate and kill existing gateway processes.
    - Start the gateway manually: `node tools/local-gateway.js`.
3.  **Validate Networking**: Ensure all targets in `tools/local-gateway.js` use `127.0.0.1` (IPv4) instead of `localhost` to avoid IPv6/IPv4 resolution delays.

## 2. Authentication & Role Verification
**Trigger:** "Access Denied" (403), hidden admin features, or empty catalog dropdowns despite DB content.

1.  **Check User Role**: Verify the user's role in the PostgreSQL `users` table.
    - **Expected value**: `superAdmin` (CamelCase).
    - **Common bug**: lowercase `superadmin` or mismatched enum.
2.  **Update Query**:
    ```sql
    UPDATE users SET role = 'superAdmin' WHERE email = '[YOUR_EMAIL]';
    ```
3.  **Session Invalidation**: If the role is updated, the user **MUST** log out and log back in to refresh their JWT. The backend `requireRole` middleware checks the token, not the database directly on every request.

## 3. Frontend Data Flow Audit
**Trigger:** API calls returning valid JSON but the UI showing empty lists or "No data found."

1.  **Response Format**: Backend services consistently wrap responses in:
    ```json
    { "success": true, "data": [ ... ] }
    ```
2.  **Axios Interceptor**: Verify `apps/web/src/lib/apiClient.ts` has an interceptor that returns `resData.data`.
3.  **Admin Client**: In `apps/web/lib/admin/api.ts`, check that methods correctly handle the unwrapped data:
    ```typescript
    const result = await apiClient.get<T>('/path');
    return result; // Result is the unwrapped data array/item
    ```
4.  **Double Prefix Bug**: Verify `NEXT_PUBLIC_API_URL`.
    - If `.env.local` has `.../api/v1` and the client code also appends `/api/v1`, you get `/api/v1/api/v1` resulting in 404.
    - Standardize: Base URL ends in `/api/v1`, client calls relative paths!

## 4. Troubleshooting "Still the same" (Cache & Sync)
If code and gateway look correct but the UI hasn't changed:

1.  **Frontend Build**: Next.js HMR can sometimes fail. Ensure `npm run dev` is running and recompiling after `api.ts` changes.
2.  **SessionStorage Cache**: The admin API client caches results in `sessionStorage` for 5 minutes.
    - **Action**: Ask the user to clear browser cache and `sessionStorage` or use a Guest/Incognito tab.
3.  **Hard Refresh**: `Ctrl + F5` to force the browser to reload all assets and bypass the cache.
