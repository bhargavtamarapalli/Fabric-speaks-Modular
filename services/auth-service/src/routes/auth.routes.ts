import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
// import { requireAuth } from '@fs/shared/middleware'; // We will build this in shared next if missing

const router = Router();

// Wiring dependencies
const userRepo = new UserRepository();
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);

// Health Check
router.get('/health', (req, res) => { res.json({ status: 'ok', service: 'auth-service' }) });

// Public Routes
router.post('/customer/login-verify', (req, res, next) => { authController.verifyFirebaseToken(req, res).catch(next); });
router.post('/logout', (req, res, next) => { authController.logout(req, res).catch(next); });

// Protected Routes (requires dummy pass for now till middleware is shared, we'll patch)
// In a real flow, a requireAuth middleware sits before these
router.get('/me', (req, res, next) => { authController.me(req, res).catch(next); });
router.delete('/delete-account', (req, res, next) => { authController.deleteAccount(req, res).catch(next); });

export { router as authRouter };
