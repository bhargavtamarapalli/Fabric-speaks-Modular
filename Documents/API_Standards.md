# Fabric Speaks — API Standards & Documentation
**Version**: 1.0 (Draft)
**Status**: ACTIVE DESIGN

## 1. Core Principles
- **RESTful Architecture**: Resources are nouns; actions are HTTP verbs.
- **Stateless**: All context (Auth) must be provided in the request headers.
- **Consistent Enveloping**: All responses follow the same JSON structure.
- **Versioned**: All endpoints are prefixed with `/api/v1/`.

---

## 2. Request Standards

### 2.1 HTTP Verbs
| Verb | Action | Success Code |
| :--- | :--- | :--- |
| `GET` | Retrieve record(s) | `200 OK` |
| `POST` | Create new record | `201 Created` |
| `PATCH` | Update specific fields | `200 OK` |
| `PUT` | Replace entire record | `200 OK` |
| `DELETE` | Soft delete record | `200 OK` |

### 2.2 Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer <token>`
- `X-Session-ID: <uuid>` (for guest cart tracking)

---

## 3. Response Standards

### 3.1 Response Envelope
All responses must return a JSON object with this structure:
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "count": 10,
    "limit": 50,
    "offset": 0
  }
}
```

### 3.2 Error Envelope
On failure (`4xx` or `5xx`), return:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "The field 'pincode' must be 6 digits.",
    "details": [ ... ]
  }
}
```

### 3.3 Error Codes
- `AUTH_REQUIRED`: Token missing or expired.
- `FORBIDDEN`: Role insufficient for this action.
- `RESOURCE_NOT_FOUND`: Item does not exist.
- `VALIDATION_FAILED`: Typed input error.
- `CONCURRENCY_ERROR`: Atomic lock/Stock mismatch.
- `GATEWAY_ERROR`: 3rd party (Razorpay/WA) failure.

---

## 4. Authentication & Authorization

### 4.1 Customer Layer
- **Mechanism**: Firebase JWT.
- **Source**: `Authorization: Bearer <id_token>`.
- **Validation**: Backend verifies via Firebase Admin SDK.

### 4.2 Admin Layer
- **Mechanism**: Role-Based Access Control (RBAC).
- **Source**: JWT custom claims (`role: superAdmin`, `role: supportAgent`).
- **Policy**: Enforced at middleware level per route.

### 4.3 Webhook Security
- **WhatsApp**: HMAC-SHA256 signature verification.
- **Razorpay**: Webhook secret verification.
- **Shiprocket**: Auth token header.

---

## 5. Pagination & Filtering

### 5.1 Pagination
- Default: `limit=20`, `offset=0`.
- Max Limit: `100`.
- Response includes `metadata.count` (total records).

### 5.2 Dynamic Filtering (Generic Attributes)
For products, filter via query params mapped to the GIN index:
`GET /products?fabric=linen&color=navy&size=M`

---

## 6. Versioning Policy
- **Breaking Changes**: Increment version (e.g., `/api/v2/`).
- **Additions**: Add fields/endpoints without version change.
- **Deprecation**: Old version supported for 6 months post-increment.
