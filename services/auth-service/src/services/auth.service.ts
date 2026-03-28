import { IUserRepository, User } from '../repositories/user.repository';
import { firebaseAuth } from '../lib/firebase';
import {
    AppError,
    ErrorCode,
    JwtPayload,
    getRedisClient,
    maskMobile,
    Role,
    roleToRoleName,
    RoleName,
    PERMISSION_MATRIX,
    ROLE_CACHE_TTL,
    ROLE_TOKEN_EXPIRY,
    ROLE_REFRESH_TOKEN_EXPIRY_DAYS,
    getCacheTTL,
    getSessionCacheKey,
    CacheInvalidationEvent,
    shouldInvalidateCache,
    getInvalidationEvents,
    SessionCacheData,
    CACHE_KEYS
} from '@fs/shared';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { env } from '../config/env';
import crypto from 'crypto';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { AUTH_CONSTANTS } from '../config/constants';
import { AdminLoginAttemptRepository } from '../repositories/admin-login-attempt.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { Queue } from 'bullmq';

export interface AuthResult {
    user: {
        id: string;
        role: string;
        isNewUser: boolean;
        name?: string | null;
        email?: string | null;
    };
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    private eventQueue: Queue;

    constructor(
        private readonly userRepo: IUserRepository,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly adminLoginRepo: AdminLoginAttemptRepository,
        private readonly refreshTokenRepo: RefreshTokenRepository
    ) {
        this.eventQueue = new Queue('platform_events', { connection: getRedisClient() });
    }

    /**
     * Get the RoleName from the user's role
     */
    private getRoleName(role: string): RoleName {
        const normalizedRole = role.toLowerCase() as Role;
        return roleToRoleName[normalizedRole] || 'CUSTOMER';
    }

    /**
     * Get permissions for a user based on their role
     */
    private getUserPermissions(roleName: RoleName): string[] {
        const rolePermissions = PERMISSION_MATRIX[roleName];
        if (!rolePermissions) {
            return [];
        }

        const permissions: string[] = [];
        for (const [feature, levels] of Object.entries(rolePermissions)) {
            for (const level of levels) {
                permissions.push(`${feature}:${level}`);
            }
        }
        return permissions;
    }

    /**
     * Cache user session in Redis
     */
    private async cacheSession(user: User): Promise<void> {
        const redis = getRedisClient();
        const roleName = this.getRoleName(user.role);
        const ttl = getCacheTTL(roleName);

        const sessionData: SessionCacheData = {
            userId: user.id,
            role: roleName,
            email: user.email || undefined,
            name: user.name || undefined,
            permissions: this.getUserPermissions(roleName),
            sessionVersion: user.session_version ?? 0,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttl * 1000),
        };

        const key = getSessionCacheKey(user.id);
        await redis.set(key, JSON.stringify(sessionData), 'EX', ttl);
    }

    /**
     * Get cached session from Redis
     */
    private async getCachedSession(userId: string): Promise<SessionCacheData | null> {
        const redis = getRedisClient();
        const key = getSessionCacheKey(userId);
        const cached = await redis.get(key);

        if (cached) {
            return JSON.parse(cached) as SessionCacheData;
        }
        return null;
    }

    /**
     * Invalidate session cache for a user
     */
    private async invalidateSessionCache(userId: string): Promise<void> {
        const redis = getRedisClient();
        const key = getSessionCacheKey(userId);
        await redis.del(key);
    }

    /**
     * Invalidate cache for all users with a specific role
     */
    private async invalidateRoleCache(roleName: RoleName, userId: string): Promise<void> {
        const events = getInvalidationEvents(roleName);

        // Check if any event should trigger cache invalidation
        for (const event of events) {
            if (shouldInvalidateCache(roleName, event)) {
                await this.invalidateSessionCache(userId);
                break;
            }
        }
    }

    /**
     * Synchronize user role with Firebase Custom Claims
     */
    private async syncFirebaseClaims(firebaseUid: string | null | undefined, role: string): Promise<void> {
        if (!firebaseUid) return;

        try {
            const roleName = this.getRoleName(role);
            // Map our backend RoleName to the string expected by AdminAuthContext.tsx
            const claimValue = roleName === 'ADMIN' ? 'SUPER_ADMIN' : 
                               roleName === 'MANAGER' ? 'INVENTORY_MANAGER' : 
                               roleName === 'SUPPORT_STAFF' ? 'SUPPORT_AGENT' : null;

            // Add background job instead of immediate call
            await this.eventQueue.add('user.sync_claims', {
                firebaseUid,
                role: claimValue
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true
            });
            
            if (env.APP_ENV === 'development') {
                console.log(`[AuthService] Queued Firebase claims sync for UID ${firebaseUid}: role=${claimValue}`);
            }
        } catch (error) {
            console.error(`[AuthService] Failed to queue Firebase claims sync for UID ${firebaseUid}:`, error);
            // Don't throw, we don't want to block login if queue sync fails but DB is correct
        }
    }

    /**
     * Generates a deterministic hash for the mobile number
     */
    private hashMobile(mobile: string): string {
        const HMAC_SALT = env.APP_JWT_SECRET; // Ensure a strong salt is stored in env
        return crypto.createHmac('sha256', HMAC_SALT).update(mobile).digest('hex');
    }

    /**
     * Generate JWT access token with role-based expiry
     * - CUSTOMER: 30 days (43200 minutes)
     * - ADMIN: 1 day (1440 minutes) - shorter for security
     * - Other roles: 30 minutes
     */
    private generateAccessToken(user: User): string {
        const roleName = this.getRoleName(user.role);
        const expiryMinutes = ROLE_TOKEN_EXPIRY[roleName] || 30;

        const payload: JwtPayload = {
            userId: user.id,
            role: user.role as Role,
            mobile: user.mobile ? user.mobile.slice(-4) : undefined,
            sessionVersion: user.session_version ?? 0
        };

        return jwt.sign(payload, env.APP_JWT_SECRET, {
            expiresIn: `${expiryMinutes}m`,
            algorithm: 'HS256'
        });
    }

    /**
     * Generate refresh token with role-based expiry
     * - CUSTOMER: 90 days
     * - ADMIN: 7 days - shorter for security
     * - Other roles: 30 days
     */
    private async generateRefreshToken(user: User): Promise<string> {
        const roleName = this.getRoleName(user.role);
        const expiryDays = ROLE_REFRESH_TOKEN_EXPIRY_DAYS[roleName] || 30;

        const refreshTokenValue = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        await this.refreshTokenRepo.create(user.id, refreshTokenValue, expiresAt);

        return refreshTokenValue;
    }

    /**
     * Generates authentication tokens with role-based caching
     */
    private async generateAuthTokens(user: User): Promise<{ accessToken: string, refreshToken: string }> {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user);

        // Cache the session in Redis
        await this.cacheSession(user);

        return { accessToken, refreshToken: refreshToken };
    }

    async registerWithEmail(data: { email: string, name: string, passwordHash: string }): Promise<AuthResult> {
        const existing = await this.userRepo.findByEmail(data.email);
        if (existing) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'Email already registered');
        }

        const user = await this.userRepo.createWithEmail(data);
        const tokens = await this.generateAuthTokens(user);

        return {
            user: {
                id: user.id,
                role: user.role,
                isNewUser: true,
                name: user.name,
                email: user.email
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    async loginWithEmail(data: { email: string, passwordRaw: string }): Promise<AuthResult> {
        const user = await this.userRepo.findByEmail(data.email);

        // Account Unification: If user exists by email but has no password, they may have 
        // registered via Google OAuth or OTP. Check if there's a user with same mobile.
        if (!user || !user.password_hash) {
            // Check if user exists by mobile (OTP user trying to login with email)
            // This is a basic check - in production, you'd want to verify ownership
            // For now, we just reject the login and ask user to use correct method
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid email or password');
        }

        // Check if admin account is locked due to failed login attempts (3+ failures in 15 minutes)
        if (user.role !== 'customer') {
            const mobileHash = this.hashMobile(user.mobile || '');
            const recentFailures = await this.adminLoginRepo.countRecentFailures(mobileHash, 15);

            if (recentFailures >= 3) {
                throw new AppError(
                    ErrorCode.UNAUTHORIZED,
                    'Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.'
                );
            }
        }

        const isValid = await bcrypt.compare(data.passwordRaw, user.password_hash);
        if (!isValid) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid email or password');
        }

        const activeUser = await this.userRepo.touchLastActive(user.id);
        const tokens = await this.generateAuthTokens(activeUser);

        return {
            user: {
                id: activeUser.id,
                role: activeUser.role,
                isNewUser: false,
                name: activeUser.name,
                email: activeUser.email
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    async loginWithGoogle(idToken: string): Promise<AuthResult> {
        try {
            const decodedToken = await firebaseAuth.verifyIdToken(idToken);
            const { uid, email, name, picture } = decodedToken;

            if (!email) {
                throw new AppError(ErrorCode.VALIDATION_ERROR, 'No email in Google token');
            }

            let user = await this.userRepo.findByFirebaseUid(uid);
            let isNewUser = false;

            if (!user) {
                // Check if user exists with this email but different provider
                const existingByEmail = await this.userRepo.findByEmail(email);
                if (existingByEmail) {
                    // Link accounts by adding firebase_uid
                    user = await this.userRepo.updateProfile(existingByEmail.id, { firebase_uid: uid });
                } else {
                    // Create new user
                    // Note: We don't have a mobile here yet
                    const result = await this.userRepo.createWithEmail({ email, name, passwordHash: 'OAUTH_USER' });
                    user = await this.userRepo.updateProfile(result.id, { firebase_uid: uid });
                    isNewUser = true;
                }
            }
            
            // Sync Firebase Custom Claims with Database Role
            await this.syncFirebaseClaims(uid, user.role);

            const activeUser = await this.userRepo.touchLastActive(user.id);
            const tokens = await this.generateAuthTokens(activeUser);

            return {
                user: {
                    id: activeUser.id,
                    role: activeUser.role,
                    isNewUser,
                    name: activeUser.name,
                    email: activeUser.email
                },
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            throw new AppError(ErrorCode.JWT_INVALID, 'Google token invalid', { error });
        }
    }

    async refreshToken(token: string): Promise<{ accessToken: string, refreshToken: string }> {
        const refreshToken = await this.refreshTokenRepo.findByToken(token);
        if (!refreshToken || refreshToken.expires_at < new Date()) {
            if (refreshToken) await this.refreshTokenRepo.revokeToken(token);
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid or expired refresh token');
        }

        const user = await this.userRepo.findById(refreshToken.user_id);
        if (!user) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

        // Rotate Refresh Token
        await this.refreshTokenRepo.revokeToken(token);
        const tokens = await this.generateAuthTokens(user);

        return tokens;
    }

    async verifyFirebaseToken(idToken: string): Promise<AuthResult> {
        try {
            const decodedToken = await firebaseAuth.verifyIdToken(idToken);
            const firebaseUid = decodedToken.uid;
            const mobile = decodedToken.phone_number;

            if (!mobile) {
                throw new AppError(ErrorCode.VALIDATION_ERROR, 'No phone number in Firebase token');
            }

            const mobileHash = this.hashMobile(mobile);
            const existingUser = await this.userRepo.findByFirebaseUid(firebaseUid);

            let user: User;
            let isNewUser = false;

            if (!existingUser) {
                const existingByHash = await this.userRepo.findByMobileHash(mobileHash);
                if (existingByHash) {
                    user = await this.userRepo.updateProfile(existingByHash.id, { firebase_uid: firebaseUid });
                } else {
                    user = await this.userRepo.createCustomer(mobile, mobileHash, firebaseUid);
                    isNewUser = true;
                }
            } else {
                user = existingUser;
            }

            // Sync Firebase Custom Claims with Database Role
            await this.syncFirebaseClaims(firebaseUid, user.role);

            const activeUser = await this.userRepo.touchLastActive(user.id);
            const tokens = await this.generateAuthTokens(activeUser);

            return {
                user: {
                    id: activeUser.id,
                    role: activeUser.role,
                    isNewUser,
                    name: activeUser.name,
                    email: activeUser.email
                },
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            throw new AppError(ErrorCode.JWT_INVALID, 'Firebase token invalid', { error });
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
            console.log(`[DEV] OTP sent to ${mobile}`); // LOG UPDATED: Removed actual OTP for security
        }
    }

    /**
     * Verify OTP and create/login user with account unification
     * Handles linking existing accounts (Google OAuth, email/password) with mobile
     */
    async verifyOtp(mobile: string, otp: string): Promise<AuthResult> {
        const redis = getRedisClient();
        const key = `${AUTH_CONSTANTS.REDIS_OTP_PREFIX}${mobile}`;

        // Get stored OTP from Redis
        const storedOtp = await redis.get(key);

        if (!storedOtp) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'OTP expired or not found. Please request a new OTP.');
        }

        if (storedOtp !== otp) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid OTP. Please try again.');
        }

        // OTP verified - delete it from Redis
        await redis.del(key);

        const mobileHash = this.hashMobile(mobile);

        // Account Unification Logic:
        // 1. Check if user exists by mobile_hash (existing OTP user)
        // 2. Check if user exists by email (existing email/password or Google user)
        // 3. Check if user exists by firebase_uid (existing Google OAuth user)
        // Link accounts if found, otherwise create new

        let user = await this.userRepo.findByMobileHash(mobileHash);
        let isNewUser = false;

        if (!user) {
            // No user by mobile - check if there's a user with the same email from other auth methods
            // For OTP login, we don't have email, so just create a new user
            user = await this.userRepo.createCustomer(mobile, mobileHash, '');
            isNewUser = true;
        }

        const activeUser = await this.userRepo.touchLastActive(user.id);
        const tokens = await this.generateAuthTokens(activeUser);

        return {
            user: {
                id: activeUser.id,
                role: activeUser.role,
                isNewUser,
                name: activeUser.name,
                email: activeUser.email
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    async deleteAccount(userId: string): Promise<void> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new AppError(ErrorCode.NOT_FOUND);

        // Invalidate session cache before deleting
        await this.invalidateSessionCache(userId);

        await this.userRepo.softDeleteCustomer(user.id);

        // Log account deletion for audit trail (RULE 6)
        await this.auditLogRepo.insert({
            adminId: userId, // User deletes their own account
            action: 'account_deleted',
            entityType: 'user',
            entityId: userId,
        });

        // Revoke Firebase sessions if UID exists
        if (user.firebase_uid) {
            try {
                await firebaseAuth.revokeRefreshTokens(user.firebase_uid);
                await firebaseAuth.deleteUser(user.firebase_uid);
            } catch (e) {
                // Ignore if Firebase user already deleted
            }
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
                mobile: maskMobile(mobile) || mobile, // Fallback if maskMobile fails
                ipAddress: ipAddress || undefined,
                attempts: failureCount
            });
        }

        return { recorded: true, admin: true, attempts: failureCount };
    }

    async requestPasswordReset(email: string): Promise<string> {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new AppError(ErrorCode.NOT_FOUND, 'No account found with this email');
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const redis = getRedisClient();
        const key = `${AUTH_CONSTANTS.REDIS_RESET_PREFIX}${email}`;

        await redis.set(key, otp, 'EX', AUTH_CONSTANTS.RESET_OTP_EXPIRY_SECONDS);

        // DEV: do not log the actual OTP — use Redis CLI to inspect if needed
        if (env.APP_ENV === 'development') {
            console.log(`[DEV] Password Reset OTP generated for user. Check Redis key: ${AUTH_CONSTANTS.REDIS_RESET_PREFIX}<email>`);
        }

        return otp;
    }

    async resetPassword(data: { email: string, otp: string, passwordRaw: string }): Promise<User> {
        const redis = getRedisClient();
        const key = `${AUTH_CONSTANTS.REDIS_RESET_PREFIX}${data.email}`;
        const storedOtp = await redis.get(key);

        if (!storedOtp || storedOtp !== data.otp) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid or expired reset code');
        }

        const user = await this.userRepo.findByEmail(data.email);
        if (!user) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.passwordRaw, salt);

        const updated = await this.userRepo.updateProfile(user.id, {
            password_hash: passwordHash,
            session_version: (user.session_version || 0) + 1
        });

        // Invalidate session cache on password reset
        await this.invalidateSessionCache(user.id);

        // Cleanup
        await redis.del(key);
        await this.refreshTokenRepo.revokeAllForUser(user.id);

        return updated;
    }

    async changePassword(userId: string, currentPasswordRaw: string, newPasswordRaw: string): Promise<User> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new AppError(ErrorCode.NOT_FOUND);

        if (!user.password_hash) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'Change password is only available for accounts with a password. If you signed in with Google, please link your account first or reset your password.');
        }

        const isValid = await bcrypt.compare(currentPasswordRaw, user.password_hash);
        if (!isValid) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid current password');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPasswordRaw, salt);

        const updated = await this.userRepo.updateProfile(userId, {
            password_hash: passwordHash,
            session_version: (user.session_version || 0) + 1
        });

        // Invalidate session cache on password change
        await this.invalidateSessionCache(userId);
        await this.refreshTokenRepo.revokeAllForUser(userId);

        return updated;
    }

    async revokeAllTokens(userId: string): Promise<void> {
        // Revoke all refresh tokens in database
        await this.refreshTokenRepo.revokeAllForUser(userId);

        // Update session_revoked_at to invalidate active JWTs immediately
        const revokedAt = new Date();
        await this.userRepo.updateProfile(userId, { session_revoked_at: revokedAt });

        // Invalidate session cache
        await this.invalidateSessionCache(userId);
    }

    async getUserById(id: string): Promise<User | null> {
        return this.userRepo.findById(id);
    }

    async updateProfile(userId: string, data: Partial<User>): Promise<User> {
        const oldUser = await this.userRepo.findById(userId);
        const updated = await this.userRepo.updateProfile(userId, data);

        // Check if role changed - invalidate cache if so
        if (oldUser && data.role && oldUser.role !== data.role) {
            const oldRoleName = this.getRoleName(oldUser.role);
            const newRoleName = this.getRoleName(data.role);

            // Invalidate old role cache
            await this.invalidateRoleCache(oldRoleName, userId);
            // New session will be created on next auth
            await this.invalidateSessionCache(userId);
        } else if (oldUser) {
            // Update session cache with new profile data
            await this.cacheSession(updated);
        }

        return updated;
    }

    /**
     * DEV ONLY: Promote a user to a new role by email
     */
    async promoteUser(email: string, role: string): Promise<{ id: string; email: string | null; name: string | null; role: string }> {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new AppError(ErrorCode.NOT_FOUND, `No user found with email: ${email}`);
        }
        const updated = await this.userRepo.updateRole(user.id, role);
        
        // Push role update to Firebase Custom Claims if UID exists
        if (updated.firebase_uid) {
            await this.syncFirebaseClaims(updated.firebase_uid, updated.role);
        }

        // Invalidate session cache so new role takes effect immediately
        await this.invalidateSessionCache(user.id);
        return { id: updated.id, email: updated.email, name: updated.name, role: updated.role };
    }
}
