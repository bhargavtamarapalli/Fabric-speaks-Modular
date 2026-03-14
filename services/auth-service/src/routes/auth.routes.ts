import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { getDbPool } from '@fs/shared';

const router = Router();

// Wiring dependencies
const db = getDbPool();
const userRepo = new UserRepository(db);
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);

// Health Check
router.get('/health', (req, res) => { res.json({ status: 'ok', service: 'auth-service' }) });

// Public Routes
router.post('/customer/login-verify', authController.verifyFirebaseToken);
router.post('/logout', authController.logout);

// Protected Routes (requires dummy pass for now till middleware is shared, we'll patch)
// In a real flow, a requireAuth middleware sits before these
router.get('/me', authController.me);
router.delete('/delete-account', authController.deleteAccount);

export { router as authRouter };
