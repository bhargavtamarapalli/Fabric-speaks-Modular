import { IUserRepository, User } from '../repositories/user.repository';
import { firebaseAuth } from '../lib/firebase';
import { AppError, ErrorCode, JwtPayload } from '@fs/shared';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import crypto from 'crypto';

export interface AuthResult {
    user: {
        id: string;
        role: string;
        isNewUser: boolean;
    };
    token: string;
}

export class AuthService {
    constructor(private readonly userRepo: IUserRepository) { }

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
            };

            const token = jwt.sign(payload, env.APP_JWT_SECRET, { expiresIn: '7d' });

            return {
                user: {
                    id: user.id,
                    role: user.role,
                    isNewUser,
                },
                token,
            };
        } catch (error: any) {
            if (error instanceof AppError) throw error;

            if (error.code?.startsWith('auth/')) {
                throw new AppError(ErrorCode.JWT_INVALID, 'Firebase token invalid or expired', { error });
            }
            throw new AppError(ErrorCode.INTERNAL_ERROR, undefined, error);
        }
    }

    async deleteAccount(userId: string): Promise<void> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new AppError(ErrorCode.NOT_FOUND);

        await this.userRepo.softDeleteCustomer(user.id);

        // Revoke Firebase sessions
        try {
            await firebaseAuth.revokeRefreshTokens(user.firebase_uid);
            await firebaseAuth.deleteUser(user.firebase_uid);
        } catch (e) {
            // Ignore if Firebase user already deleted
        }
    }
}
