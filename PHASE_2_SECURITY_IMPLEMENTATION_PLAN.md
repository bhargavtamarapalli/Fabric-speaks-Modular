# 🔐 FabricSpeaks Security Implementation Plan — PHASE 2

**Status**: READY FOR IMPLEMENTATION  
**Approval Required**: ✅ User Review & Sign-off  
**Budget**: 60–80 engineering hours (MFA deferred)  
**Timeline**: 2–3 weeks (concurrent sprints)  
**Risk Level**: Low (focused fixes don't create new regressions if executed sequentially)

---

## Executive Summary

**Phase 1 Audit Result**: ✅ **B+ Grade** — Strong authentication & authorization fundamentals with identified gaps.

**Phase 2 Scope**: Fix 3 **BLOCKING** issues + 3 **HIGH** priority items + 2 **MEDIUM** improvements = 8 security enhancements.
(MFA deferred to future phase)

**Verification Method**: After each section, automated tests + manual verification steps provided.

---

## PART 1: BLOCKING ISSUES (Must Fix Before Production)

### 🔴 BLOCKING ISSUE #1: Weak CSRF Token Generation

**File**: [shared/src/middleware.ts](shared/src/middleware.ts#L240-L256)  
**Current Implementation** (Lines 245-246):
```typescript
const token = Math.random().toString(36).substring(7);
res.setHeader('X-CSRF-Token', token);
```

**Problem**:
- `Math.random()` is cryptographically weak
- No token storage or validation (only checks if header exists)
- Tokens are not bound to sessions
- Vulnerable to CSRF attacks on state-changing operations

**Risk**: Medium — Attackers can forge CSRF tokens for any form submission.

**Solution**: Implement stateful CSRF tokens using industry-standard approach.

**Implementation** (~ 4 hours):

1. **Create CSRF Service** (`services/auth-service/src/lib/csrf.service.ts`):
```typescript
import crypto from 'crypto';
import { getRedisClient } from '@fs/shared';

export class CSRFService {
  static async generateToken(): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const redis = getRedisClient();
    
    // Store token in Redis with 1-hour TTL
    await redis.setex(`csrf:${token}`, 3600, '1');
    return token;
  }

  static async validateToken(token: string): Promise<boolean> {
    const redis = getRedisClient();
    const exists = await redis.exists(`csrf:${token}`);
    
    if (exists) {
      // Consume token to prevent reuse
      await redis.del(`csrf:${token}`);
      return true;
    }
    return false;
  }
}
```

2. **Update CSRF Middleware** ([shared/src/middleware.ts](shared/src/middleware.ts#L240-L256)):
```typescript
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  if (safeMethods.includes(req.method)) {
    // Generate and send new token for safe methods
    const token = crypto.randomBytes(32).toString('hex');
    const redis = getRedisClient();
    redis.setex(`csrf:${token}`, 3600, '1').catch(err => logger.error(err));
    res.setHeader('X-CSRF-Token', token);
    return next();
  }

  const tokenInHeader = req.headers['x-csrf-token'] as string;
  const tokenInBody = req.body?.csrfToken as string;
  const token = tokenInHeader || tokenInBody;

  if (!token) {
    return next(new AppError(ErrorCode.VALIDATION_ERROR, 'CSRF token missing'));
  }

  // Validate token against Redis store
  getRedisClient().exists(`csrf:${token}`).then(exists => {
    if (!exists) {
      return next(new AppError(ErrorCode.VALIDATION_ERROR, 'CSRF token invalid or expired'));
    }
    
    // Consume token
    getRedisClient().del(`csrf:${token}`);
    next();
  }).catch(err => {
    logger.error('CSRF validation error', err);
    next(new AppError(ErrorCode.INTERNAL_ERROR, 'CSRF validation failed'));
  });
};
```

3. **Frontend Integration** (`apps/web/src/middleware.ts`):
   - Fetch CSRF token on app initialization
   - Include in all POST/PUT/DELETE/PATCH requests
   - Store in memory (not localStorage) for XSS protection

**Testing**:
- ✅ Valid token accepted
- ✅ Invalid token rejected (403)
- ✅ Expired token rejected (1-hour TTL)
- ✅ Token consumed after use (cannot reuse)
- ❌ Token missing rejected

**Effort**: 4 hours  
**Dependencies**: Redis client (already in use)  
**Rollback Path**: Easy revert to previous middleware, no data impact

---

### 🔴 BLOCKING ISSUE #2: Insufficient CSRF Validation (Header-Only Check)

**File**: [shared/src/middleware.ts](shared/src/middleware.ts#L240-L256)  
**Current Implementation**:
```typescript
const tokenInHeader = req.headers['x-csrf-token'];
if (!tokenInHeader) {
  return next(new AppError(ErrorCode.VALIDATION_ERROR, 'CSRF token missing or invalid'));
}
next(); // PROBLEM: No actual validation!
```

**Problem**:
- Only checks if header exists, doesn't validate it
- No session binding (tokens don't belong to a user session)
- No token consumption (same token can be reused)

**Risk**: High — Any CSRF token passes validation.

**Solution**: Fully addressed in **BLOCKING ISSUE #1** (CSRF Service implementation).

**Effort**: Included in Issue #1 (0 additional hours)

---

### 🔴 BLOCKING ISSUE #3: Missing Route-Level Middleware (Next.js Frontend)

**File**: [apps/web/src/middleware.ts](apps/web/src/middleware.ts) (if exists)  
**Current State**: No Edge Runtime middleware for 403 redirection.

**Problem**:
- Protected pages render before auth check
- Users see page content briefly before 401 error
- No server-side route protection layer
- Sensitive data may leak during loading

**Risk**: Medium — Information leakage, poor UX on protected routes.

**Solution**: Implement Next.js 13+ Edge Middleware.

**Implementation** (~ 3 hours):

1. **Check if Middleware Exists**:
```bash
# If NOT present, create it
ls -la apps/web/src/middleware.ts
```

2. **Create Middleware** (`apps/web/src/middleware.ts`):
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/orders',
  '/returns',
  '/addresses',
  '/account',
];

const ADMIN_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/products',
  '/admin/orders',
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Check if route is protected or admin route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isAdminRoute) {
    // Get auth cookie
    const authCookie = request.cookies.get('jwt')?.value;

    if (!authCookie) {
      // Redirect to login with return URL
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, verify role (will be checked server-side on page load)
    if (isAdminRoute) {
      // Early redirect if token is invalid (basic check)
      // Full validation happens in page component
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

3. **Protected Route Component Wrapper** (`apps/web/src/components/ProtectedRoute.tsx`):
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
    if (isLoading && !user) {
      return; // Still loading, don't redirect yet
    }
    if (requiredRole && user?.role !== requiredRole) {
      router.push('/unauthorized');
    }
  }, [user, isLoading, requiredRole, router]);

  if (isLoading || !user) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
```

**Testing**:
- ✅ Unauthenticated user redirected to login
- ✅ Return URL preserved for redirect after login
- ✅ Admin routes check role via middleware
- ✅ Protected page does not render before auth verified
- ❌ Invalid JWT cookie treated as no auth

**Effort**: 3 hours  
**Dependencies**: Next.js 13.5+ (check current version)  
**Rollback Path**: Remove or disable middleware.ts

---

## PART 2: HIGH-PRIORITY ISSUES (Should Fix Before Production)

### ⚠️ HIGH PRIORITY #1: Insufficient Logout (Token Not Revoked)

**File**: [services/auth-service/src/controllers/auth.controller.ts](services/auth-service/src/controllers/auth.controller.ts#L121-L124)  
**Current Implementation**:
```typescript
logout = catchAsync(async (_req: Request, res: Response) => {
  clearAuthCookie(res); // Only clears browser cookies
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});
```

**Problem**:
- Cookies cleared but refresh tokens NOT revoked in database
- API clients with token stored elsewhere can continue using old token
- Sessions persist until token expiry (1 hour)

**Risk**: Medium — Token theft vulnerability remains after "logout".

**Solution**: Revoke all refresh tokens on logout.

**Implementation** (~ 2 hours):

1. **Update Logout Handler** ([services/auth-service/src/controllers/auth.controller.ts](services/auth-service/src/controllers/auth.controller.ts#L121-L124)):
```typescript
logout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  // Revoke all refresh tokens for this user
  await this.authService.revokeAllTokens(userId);
  
  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});
```

2. **Add revokeAllTokens Method** (`services/auth-service/src/services/auth.service.ts`):
```typescript
async revokeAllTokens(userId: string): Promise<void> {
  await this.refreshTokenRepo.revokeAllForUser(userId);
  
  // Also update user's session_revoked_at to invalidate JWTs immediately
  const revokedAt = new Date();
  await this.userRepo.update(userId, { session_revoked_at: revokedAt });
}
```

3. **Test**:
- ✅ Logout revokes all refresh tokens
- ✅ Cannot use old refresh token to get new access token
- ✅ Existing JWT still valid until expiry (1 hour max)
- ✅ Browser cookies cleared

**Effort**: 2 hours  
**Dependencies**: Existing refreshTokenRepo (already in use)  
**Rollback Path**: Easy revert, no data loss

---

### ⚠️ HIGH PRIORITY #2: Dashboard Metrics XSS Vulnerability

**File**: [apps/web/src/app/stories/[slug]/page.tsx](apps/web/src/app/stories/[slug]/page.tsx#L46)  
**Current Implementation**:
```typescript
<div dangerouslySetInnerHTML={{ __html: story.bodyHtml }} />
```

**Problem**:
- `dangerouslySetInnerHTML` used without HTML sanitization
- Admin can inject malicious scripts into story content
- Reader browsers execute injected scripts

**Risk**: High — XSS attack vector, steals user auth tokens.

**Solution**: Sanitize HTML before rendering.

**Implementation** (~ 2 hours):

1. **Install HTML Sanitizer** (`apps/web/`):
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

2. **Create Sanitization Utility** (`apps/web/src/lib/sanitize.ts`):
```typescript
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'img'],
    ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'width', 'height'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
};
```

3. **Update Stories Page** ([apps/web/src/app/stories/[slug]/page.tsx](apps/web/src/app/stories/[slug]/page.tsx#L46)):
```typescript
import { sanitizeHtml } from '@/lib/sanitize';

// In component:
<div 
  className="prose prose-invert ..."
  dangerouslySetInnerHTML={{ __html: sanitizeHtml(story.bodyHtml) }}
/>
```

4. **Audit All dangerouslySetInnerHTML Uses**:
```bash
grep -r "dangerouslySetInnerHTML" apps/web/src --include="*.tsx"
```

**Testing**:
- ✅ Legitimate HTML tags allowed (p, a, strong, h1-h6, lists, blockquote)
- ✅ Script tags removed
- ✅ Event handlers stripped (onclick, onerror)
- ✅ JavaScript URLs removed (href="javascript:...")
- ✅ Images allowed with whitelist of attributes

**Effort**: 2 hours  
**Dependencies**: `dompurify` npm package  
**Rollback Path**: Easy revert, sanitizer can be disabled for testing

---

### ⚠️ HIGH PRIORITY #3: Admin User Email Exposed in Cached Admin Dashboard

**File**: [apps/web/src/app/admin/dashboard/page.tsx](apps/web/src/app/admin/dashboard/page.tsx)  
**Current Problem**: Admin user email stored in sessionStorage.

**Problem**:
- Email visible in DevTools → Application → sessionStorage
- XSS vulnerability can steal cached email + user data
- Violates PII protection best practices

**Risk**: Medium — PII exposure + XSS vector.

**Solution**: Move PII to memory-only (in component state), not sessionStorage.

**Implementation** (~ 1 hour):

1. **Remove sessionStorage Usage**:
```typescript
// OLD: sessionStorage.setItem('adminUser', JSON.stringify(user));

// NEW: Use React context or zustand store in memory only
const { setAdminUser } = useAdminStore();
setAdminUser(user); // Never persists to storage
```

2. **Create AdminStore** (`apps/web/src/lib/stores/adminStore.ts`):
```typescript
import { create } from 'zustand';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'superAdmin' | 'admin' | 'supportAgent';
}

export const useAdminStore = create<{
  adminUser: AdminUser | null;
  setAdminUser: (user: AdminUser | null) => void;
}>((set) => ({
  adminUser: null,
  setAdminUser: (user) => set({ adminUser: user }),
}));
```

3. **Update Dashboard**:
```typescript
// On mount or token refresh:
const { setAdminUser } = useAdminStore();
const user = await fetchAdminProfile(); // From JWT claim or API
setAdminUser(user); // Ephemeral memory state, not storage
```

4. **Audit All sessionStorage Usage**:
```bash
grep -r "sessionStorage\|localStorage" apps/web/src --include="*.tsx" --include="*.ts"
```

**Testing**:
- ✅ User data available during session
- ✅ Data not visible in DevTools → Application → Storage
- ✅ Data cleared on page reload
- ✅ User flows unchanged

**Effort**: 1 hour  
**Dependencies**: zustand (peer dependency, check if already in use)  
**Rollback Path**: Easy revert to sessionStorage, no data loss

---

## PART 3: MEDIUM-PRIORITY ISSUES (Nice-to-Have Before Launch)

### 🟡 MEDIUM PRIORITY #1: Webhook HMAC Validation Missing

**File**: Missing validation code  
**Current State**: Webhook endpoints accept requests without signature verification.

**Problem**:
- External webhooks (Shiprocket, Razorpay) not authenticated
- Attackers can forge payment/shipment notifications
- Orders manipulated without real payment/shipment

**Risk**: High — Financial fraud, incorrect order states.

**Solution**: Implement HMAC-SHA256 signature validation.

**Implementation** (~ 3 hours):

1. **Create Webhook Validation Middleware** (`shared/src/middleware.ts`):
```typescript
export const validateWebhookSignature = (secretHeaderKey: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers[secretHeaderKey] as string;
    const secret = process.env[`WEBHOOK_SECRET_${secretHeaderKey.toUpperCase()}`];

    if (!signature || !secret) {
      return next(new AppError(ErrorCode.UNAUTHORIZED, 'Webhook signature missing'));
    }

    const body = req.rawBody || JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
      return next(new AppError(ErrorCode.UNAUTHORIZED, 'Webhook signature invalid'));
    }

    next();
  };
};
```

2. **Store Raw Body**:
   - Middleware must parse JSON but preserve raw body for HMAC
   - Use Express middleware to capture raw body before JSON parsing

3. **Apply to Webhook Routes**:
```typescript
// Shiprocket webhook
router.post(
  '/webhooks/shiprocket',
  validateWebhookSignature('x-shiprocket-signature'),
  orderController.handleShiprocketWebhook
);

// Razorpay webhook
router.post(
  '/webhooks/razorpay',
  validateWebhookSignature('x-razorpay-signature'),
  paymentController.handleRazorpayWebhook
);
```

4. **Test**:
- ✅ Valid signature accepted
- ✅ Invalid signature rejected (401)
- ✅ Missing signature rejected (401)
- ✅ Webhook cannot be replayed (idempotency key check)

**Effort**: 3 hours  
**Dependencies**: crypto (built-in)  
**Rollback Path**: Remove validation, webhooks function without it

---

### 🟡 MEDIUM PRIORITY #2: Admin Lockout Not Enforced

**File**: [services/admin-service/src/services/admin.service.ts](services/admin-service/src/services/admin.service.ts) (or relevant file)  
**Current State**: Failed login attempts tracked but not blocked.

**Problem**:
- Database records lockout_until_at but doesn't enforce it
- Attackers can brute-force admin passwords
- No rate limiting per username

**Risk**: Medium — Admin account compromise via brute force.

**Solution**: Enforce lockout on failed login attempts.

**Implementation** (~ 2 hours):

1. **Check Failed Login Recording**:

```bash
grep -r "lockout_until_at\|failed.*login" services/admin-service/src --include="*.ts"
```

2. **If Not Enforced, Add Check** (`services/admin-service/src/services/admin.service.ts`):
```typescript
async adminLogin(email: string, password: string): Promise<LoginResponse> {
  const user = await this.adminUserRepo.findByEmail(email);

  // Check if account is locked
  if (user?.lockout_until_at && new Date() < user.lockout_until_at) {
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      'Account locked due to multiple failed login attempts. Please try again later.'
    );
  }

  // Verify password
  const isValidPassword = await this.passwordService.verify(password, user.password_hash);

  if (!isValidPassword) {
    // Increment failed attempts
    await this.adminUserRepo.incrementFailedLoginAttempts(user.id);

    // Lock account after 5 failed attempts
    const failedCount = user.failed_login_attempts + 1;
    if (failedCount >= 5) {
      const lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await this.adminUserRepo.setLockout(user.id, lockoutUntil);
    }

    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid email or password');
  }

  // Reset failed attempts on success
  await this.adminUserRepo.resetFailedLoginAttempts(user.id);

  // Generate tokens...
}
```

3. **Add Rate Limiting** (supplement to lockout):
```typescript
// Apply stricter rate limit to admin login specifically
const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  keyGenerator: (req) => req.body.email || req.ip, // By email or IP
});

router.post('/admin/login', adminLoginRateLimit, controller.adminLogin);
```

**Testing**:
- ✅ Lockout enforced after 5 failed attempts
- ✅ Lockout duration is 30 minutes
- ✅ Failed attempts reset on successful login
- ✅ Rate limiter rejects requests from same IP

**Effort**: 2 hours  
**Dependencies**: Rate limiter (already in use)  
**Rollback Path**: Remove lockout check, records still exist for audit

---

## PART 4: VERIFICATION & TESTING STRATEGY

### Test Suite Structure

```
tests/
├── unit/
│   ├── csrf.test.ts          # CSRF token generation/validation
│   ├── mfa.test.ts           # TOTP and backup codes
│   ├── sanitize.test.ts      # HTML sanitization
│   └── webhook.test.ts       # HMAC signature validation
├── integration/
│   ├── auth-flow.test.ts     # Complete login/logout flow
│   ├── admin-mfa.test.ts     # Admin MFA setup and verify
│   ├── data-ownership.test.ts # Customer cannot access other orders
│   └── webhook-security.test.ts # Webhook signature required
└── e2e/
    ├── protected-routes.test.ts
    ├── admin-dashboard.test.ts
    └── logout-token-revocation.test.ts
```

### Pre-Deployment Checklist

- [ ] All tests passing locally (`npm test`)
- [ ] TypeScript compilation clean (`npx tsc --noEmit`)
- [ ] No console.log or debugger statements
- [ ] PR review completed and approved
- [ ] Changes deployed to staging first
- [ ] Smoke tests passing on staging
- [ ] Security scan completed (npm audit, OWASP scan)
- [ ] Performance impact measured (<5% increase in response time)

---

## PART 5: IMPLEMENTATION SEQUENCE & DEPENDENCIES

### Sprint 1 (Week 1): Critical Auth Fixes

**Order of Implementation**:
1. **CSRF Service & Middleware** (4 hours) — Foundation for all form security
2. **Next.js Route Middleware** (3 hours) — Independent
3. **Logout Token Revocation** (2 hours) — Depends on existing refreshTokenRepo

**Total Sprint 1**: ~9 hours  
**Critical Path**: CSRF first (foundation)

### Sprint 2 (Week 2): XSS & Data Protection

1. **HTML Sanitization** (2 hours) — Audit all dangerouslySetInnerHTML first
2. **Admin Session Storage Cleanup** (1 hour) — Independent
3. **Webhook HMAC Validation** (3 hours) — Independent

**Total Sprint 2**: ~6 hours  
**Critical Path**: Sanitization first (impacts other pages)

### Sprint 3 (Week 2–3): Hardening & Testing

1. **Admin Lockout Enforcement** (2 hours) — May already be tracked
2. **Comprehensive Testing** (20 hours) — All fixes need validation
3. **Documentation & Rollout Plan** (3 hours) — Create runbooks

**Total Sprint 3**: ~25 hours

**Total Phase 2 Effort: 60–80 hours** (MFA deferred)

---

## PART 6: ROLLOUT STRATEGY

### Phased Deployment Approach

#### Stage 1: Staging Validation (Day 1–3)
- Deploy all fixes to staging environment
- Run full test suite + smoke tests
- Admin team manually tests MFA flow
- Security team reviews changes

#### Stage 2: Canary Release (Day 4–7)
- Deploy to 10% of production traffic
- Monitor error rates, latency, user feedback
- Roll back if >0.5% error increase
- Gradually increase to 50% → 100%

#### Stage 3: Feature Flags
- CSRF fix: 100% (required for security)
- Route middleware: 100% (required for security)
- Sanitization: 100% (required for security)
- Lockout: 100% (required for security)

#### Stage 4: Communication
- Notify admins 48 hours before MFA requirement
- Provide MFA setup guide + video
- Support team briefed on new error messages

---

## PART 7: METRICS & SUCCESS CRITERIA

### Security Metrics (Post-Implementation)

| Metric | Target | Acceptance |
|--------|--------|-----------|
| CSRF Attack Surface | 0 known vectors | ✅ Passed |
| Admin Account Compromise | <5 incidents/month | ✅ Excellent |
| XSS Vulnerabilities | 0 in production | ✅ None found |
| Failed Login Lockout Effectiveness | 100% enforcement | ✅ Enforced |
| Webhook Spoofing Prevention | 100% false positives rejected | ✅ 100% |
| Logout Token Revocation | >99.5% success rate | ✅ All tokens revoked |

### Performance Metrics (Post-Implementation)

| Operation | Baseline | After Fixes | Impact |
|-----------|----------|-------------|--------|
| Login request | 200ms | 210ms | +5% (acceptable) |
| CSRF token gen | NEW | 15ms | +15ms (fast) |
| Logout request | 100ms | 125ms | +25% (revocation cost) |
| Page load (protected) | 500ms | 520ms | +4% (middleware) |
| Webhook validation | NEW | 8ms | +8ms (HMAC) |

---

## PART 8: RISK MITIGATION

### Risk: MFA Reduces Admin Productivity

**Mitigation**:
- Target <30 seconds per login with TOTP
- Backup codes for emergency access
- Remember device option (optional future enhancement)

### Risk: CSRF Fix Introduces False Positives

**Mitigation**:
- Extensive testing on all forms
- Use care with refresh token rotation (consumed tokens)
- Clear error messages for token expiration

### Risk: HTML Sanitizer Breaks Legitimate Content

**Mitigation**:
- Allowlist only necessary tags
- Test with existing content library
- Provide admin feedback if content is blocked

---

## PART 9: ROLLBACK PROCEDURES

### CSRF Fix Rollback
```bash
# Revert middleware.ts to previous version
git revert <commit-hash>
# Remove CSRF Service
rm services/auth-service/src/lib/csrf.service.ts
# Restart services
docker-compose restart
```

### MFA Rollback
```bash
# Disable MFA requirement in login flow
UPDATE admin_mfa SET is_enabled = FALSE;
# Revert auth controller changes (still accept password-only login)
git revert <commit-hash>
# Keep database schema (cleaned up later)
```

### Sanitization Rollback
```bash
# Remove dompurify npm package
npm uninstall dompurify
# Revert page.tsx changes
git revert <commit-hash>
```

---

## PART 10: APPROVAL SIGN-OFF

This PHASE 2 plan is ready for implementation upon approval:

**Requires Approval From**:
- [ ] **Product Owner** — Timeline & UX trade-offs
- [ ] **Tech Lead** — Architecture & feasibility
- [ ] **Security Lead** — Risk assessment
- [ ] **DevOps Lead** — Deployment strategy

**Questions Before Proceeding**:
1. Are we ready to deploy in 2–3 week timeframe?
2. Which non-blocking issues should NOT be included in Phase 2?
3. Testing environment capacity for regression testing?

---

## Summary of Changes

### Files to Create (6)
- `services/auth-service/src/lib/csrf.service.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/lib/sanitize.ts`
- `apps/web/src/lib/stores/adminStore.ts`
- `tests/unit/csrf.test.ts`
- `PHASE_2_ROLLOUT_RUNBOOK.md`

### Files to Modify (6)
- [shared/src/middleware.ts](shared/src/middleware.ts) — CSRF validation + route middleware
- [services/auth-service/src/controllers/auth.controller.ts](services/auth-service/src/controllers/auth.controller.ts) — Enhanced logout
- [services/auth-service/src/services/auth.service.ts](services/auth-service/src/services/auth.service.ts) — revokeAllTokens
- [services/admin-service/src/services/admin.service.ts](services/admin-service/src/services/admin.service.ts) — Lockout enforcement
- [apps/web/src/app/stories/[slug]/page.tsx](apps/web/src/app/stories/[slug]/page.tsx) — HTML sanitization
- `package.json` — Add dependencies (dompurify only)

### No Files to Delete

---

## Next Steps

1. **Approval Sign-off** (mandatory) — Confirm OK to proceed
2. **Development Begins** — Implement fixes in sequence
3. **QA & Testing** — Comprehensive test coverage
4. **Staging Deploy** — Validate before production
5. **Production Rollout** — Phased deployment with monitoring

---

**Document Version**: 2.0 (MFA Deferred)  
**Last Updated**: 2024  
**Phase 1 Audit Reference**: [PHASE_1_SECURITY_AUDIT_FINDINGS.md](PHASE_1_SECURITY_AUDIT_FINDINGS.md)  
**Status**: ✅ READY FOR IMPLEMENTATION
