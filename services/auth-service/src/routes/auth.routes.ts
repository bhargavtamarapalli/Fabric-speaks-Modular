import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { AdminLoginAttemptRepository } from '../repositories/admin-login-attempt.repository';
import { getDbPool } from '@fs/shared';
import { otpRateLimiter } from '../middleware/rateLimiter';
import { requireAuth, csrfProtection } from '@fs/shared';

const router = Router();

// Wiring dependencies
const db = getDbPool();
const userRepo = new UserRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const adminLoginRepo = new AdminLoginAttemptRepository(db);
const authService = new AuthService(userRepo, auditLogRepo, adminLoginRepo);
const authController = new AuthController(authService);

// Health Check
router.get('/health', (_req, res) => { res.json({ status: 'ok', service: 'auth-service' }) });

// Public Routes
router.post('/customer/login-otp', otpRateLimiter, authController.loginOtp);
router.post('/customer/login-verify', otpRateLimiter, authController.verifyFirebaseToken);
router.post('/admin/login/failed', authController.recordAdminLoginFailure);
router.post('/logout', authController.logout);

// Protected Routes
router.use(requireAuth);
router.use(csrfProtection);

router.get('/me', authController.me);
router.delete('/delete-account', authController.deleteAccount);

export { router as authRouter };
