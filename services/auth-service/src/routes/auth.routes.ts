import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { AdminLoginAttemptRepository } from '../repositories/admin-login-attempt.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { getDbPool, requireAuth, requireRole, csrfProtection } from '@fs/shared';
import { otpRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Wiring dependencies
const db = getDbPool();
const userRepo = new UserRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const adminLoginRepo = new AdminLoginAttemptRepository(db);
const refreshTokenRepo = new RefreshTokenRepository(db);
const authService = new AuthService(userRepo, auditLogRepo, adminLoginRepo, refreshTokenRepo);
const authController = new AuthController(authService);

// Health Check
router.get('/health', (_req, res) => { res.json({ status: 'ok', service: 'auth-service' }) });

// Public Routes
router.post('/register', otpRateLimiter, authController.register);
router.post('/login', otpRateLimiter, authController.login);
router.post('/login-google', authController.loginGoogle);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/customer/login-otp', otpRateLimiter, authController.loginOtp);
router.post('/customer/otp-verify', otpRateLimiter, authController.verifyOtp);
router.post('/customer/login-verify', otpRateLimiter, authController.verifyFirebaseToken);

// Protected Routes
router.use(requireAuth);
router.use(csrfProtection); // Re-enabled for permanent security

router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.get('/customer/profile', authController.getProfile);
router.patch('/customer/profile', authController.updateProfile);
router.patch('/customer/change-password', authController.changePassword);
router.delete('/delete-account', authController.deleteAccount);

// Session & Activity Management
router.get('/sessions', authController.getSessions);
router.get('/audit-logs', authController.getAuditLogs);
router.post('/sessions/revoke-others', authController.revokeOtherSessions);
router.post('/sessions/revoke', authController.revokeSession);

// Admin login failure tracking (requires authentication to prevent abuse)
router.post('/admin/login/failed', otpRateLimiter, authController.recordAdminLoginFailure);

// DEV ONLY - User role promotion (disabled in production inside the controller)
// Protected with requireRole to ensure only SUPER_ADMIN can use
router.post('/dev/promote-user', requireRole('superAdmin'), authController.promoteUser);

export { router as authRouter };
