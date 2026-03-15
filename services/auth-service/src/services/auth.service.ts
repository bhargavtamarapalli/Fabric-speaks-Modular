import { IUserRepository, User } from '../repositories/user.repository';
import { firebaseAuth } from '../lib/firebase';
import { AppError, ErrorCode, JwtPayload, getRedisClient, maskMobile } from '@fs/shared';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import crypto from 'crypto';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { AUTH_CONSTANTS } from '../config/constants';
import { AdminLoginAttemptRepository } from '../repositories/admin-login-attempt.repository';
import { Queue } from 'bullmq';

export interface AuthResult {
    user: {
        id: string;
        role: string;
        isNewUser: boolean;
    };
    token: string;
}

export class AuthService {
    private eventQueue: Queue;

    constructor(
        private readonly userRepo: IUserRepository,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly adminLoginRepo: AdminLoginAttemptRepository
    ) {
        this.eventQueue = new Queue('platform_events', { connection: getRedisClient() });
    }

    /**
     * Generates a deterministic hash for the mobile number
     */
    private hashMobile(mobile: string): string {
        const HMAC_SALT = env.APP_JWT_SECRET; // Ensure a strong salt is stored in env
        return crypto.createHmac('sha256', HMAC_SALT).update(mobile).digest('hex');
    }

    /**
     * Verifies the Firebase token, checks if user exists, creates if not.
     */
    async verifyFirebaseToken(idToken: string): Promise<AuthResult> {
        try {
            // 1. Verify token with Firebase Admin
            const decodedToken = await firebaseAuth.verifyIdToken(idToken);
            const firebaseUid = decodedToken.uid;
            const mobile = decodedToken.phone_number;

            if (!mobile) {
                throw new AppError(ErrorCode.VALIDATION_ERROR, 'No phone number in Firebase token');
            }

            const mobileHash = this.hashMobile(mobile);

            // 2. Query DB to prevent 403 Account Deleted login attempts
            const existingUser = await this.userRepo.findByFirebaseUid(firebaseUid);
            let user: User;
            let isNewUser = false;

            if (!existingUser) {
                // Double check by hash in case of multiple Firebase UIDs for same phone
                const existingByHash = await this.userRepo.findByMobileHash(mobileHash);
                if (existingByHash) {
                    // If we find them by hash, they just got a new Firebase UID. We should ideally update it, 
                    // but for now we just use the existing one to be safe.
                    user = existingByHash;
                } else {
                    // 3. New user - Create profile
                    user = await this.userRepo.createCustomer(mobile, mobileHash, firebaseUid);
                    isNewUser = true;
                }
            } else {
                user = existingUser;
            }

            // 4. Generate Session Cookie (JWT)
            const payload: JwtPayload = {
                userId: user.id,
                role: user.role as any,
                mobile: user.mobile.slice(-4), // Last 4 digits only (RULE 5: PII masking)
                sessionVersion: user.session_version ?? 0
            };

            const token = jwt.sign(payload, env.APP_JWT_SECRET, { 
                expiresIn: '30d',
                algorithm: 'HS256'
            });

            return {
                user: {
                    id: user.id,
                    role: user.role,
                    isNewUser,
                },
                token,
            };
        } catch (error: unknown) {
            if (error instanceof AppError) throw error;

            const err = error as { code?: string };
            if (err.code?.startsWith('auth/')) {
                throw new AppError(ErrorCode.JWT_INVALID, 'Firebase token invalid or expired', { error: error as any });
            }
            throw new AppError(ErrorCode.INTERNAL_ERROR, undefined, error as any);
        }
    }

    async generateOtp(mobile: string): Promise<void> {
        // Generate 6-digit random OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const redis = getRedisClient();
        
        const key = `${AUTH_CONSTANTS.REDIS_OTP_PREFIX}${mobile}`;
        
        // Store in Redis with 120s TTL
        await redis.set(key, otp, 'EX', AUTH_CONSTANTS.OTP_EXPIRY_SECONDS);
        
        // In a real app, we would call an SMS service here
        // For development, we log it (but never in production!)
        if (env.APP_ENV === 'development') {
            console.log(`[DEV] OTP for ${mobile}: ${otp}`);
        }
    }

    async deleteAccount(userId: string): Promise<void> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new AppError(ErrorCode.NOT_FOUND);

        await this.userRepo.softDeleteCustomer(user.id);

        // Log account deletion for audit trail (RULE 6)
        await this.auditLogRepo.insert({
            adminId: userId, // User deletes their own account
            action: 'account_deleted',
            entityType: 'user',
            entityId: userId,
        });

        // Revoke Firebase sessions
        try {
            await firebaseAuth.revokeRefreshTokens(user.firebase_uid);
            await firebaseAuth.deleteUser(user.firebase_uid);
        } catch (e) {
            // Ignore if Firebase user already deleted
        }
    }

    async recordAdminLoginFailure(mobile: string, ipAddress?: string | null, reason?: string) {
        const mobileHash = this.hashMobile(mobile);
        await this.adminLoginRepo.recordAttempt({
            mobileHash,
            ipAddress: ipAddress ?? null,
            success: false,
            reason: reason ?? null
        });

        const user = await this.userRepo.findByMobileHash(mobileHash);
        if (!user || user.role === 'customer') {
            return { recorded: true, admin: false };
        }

        const failureCount = await this.adminLoginRepo.countRecentFailures(mobileHash, 15);
        if (failureCount >= 3) {
            await this.eventQueue.add('admin.login_failed', {
                adminId: user.id,
                mobile: maskMobile(mobile),
                ipAddress: ipAddress ?? undefined,
                attempts: failureCount
            });
        }

        return { recorded: true, admin: true, attempts: failureCount };
    }
}
