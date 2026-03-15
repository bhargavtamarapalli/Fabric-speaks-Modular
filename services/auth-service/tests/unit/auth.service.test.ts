import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { User } from '../../src/repositories/user.repository';
import { AppError } from '@fs/shared';

// Mock Redis and @fs/shared
const mockRedis = {
    set: vi.fn(),
    get: vi.fn(),
};

vi.mock('../../src/lib/firebase', () => ({
    firebaseAuth: {
        verifyIdToken: vi.fn(),
        revokeRefreshTokens: vi.fn(),
        deleteUser: vi.fn(),
    }
}));

vi.mock('@fs/shared', async () => {
    const actual = await vi.importActual('@fs/shared');
    return {
        ...actual,
        getRedisClient: () => mockRedis,
    };
});

import { firebaseAuth } from '../../src/lib/firebase';
import { getRedisClient } from '@fs/shared';

describe('AuthService', () => {
    let authService: AuthService;
    let mockUserRepo: any;

    let mockAuditLogRepo: any;
    let mockAdminLoginRepo: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockUserRepo = {
            findById: vi.fn(),
            findByMobileHash: vi.fn(),
            findByFirebaseUid: vi.fn(),
            createCustomer: vi.fn(),
            softDeleteCustomer: vi.fn(),
        };

        mockAuditLogRepo = {
            insert: vi.fn(),
        };

        mockAdminLoginRepo = {
            recordAttempt: vi.fn(),
            countRecentFailures: vi.fn(),
        };

        authService = new AuthService(mockUserRepo, mockAuditLogRepo, mockAdminLoginRepo);
    });

    describe('verifyFirebaseToken', () => {
        it('creates a new user and returns JWT if Firebase UID is new', async () => {
            const mockDecodedToken = {
                uid: 'test_uid',
                phone_number: '+919876543210',
            };

            (firebaseAuth.verifyIdToken as any).mockResolvedValue(mockDecodedToken);

            // Simulate no existing user
            mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
            mockUserRepo.findByMobileHash.mockResolvedValue(null);

            // Simulate creation
            mockUserRepo.createCustomer.mockResolvedValue({
                id: 'user_123',
                role: 'customer',
                mobile: mockDecodedToken.phone_number,
                mobile_hash: 'hashed',
                firebase_uid: 'test_uid',
                is_deleted: false,
            } as User);

            const result = await authService.verifyFirebaseToken('valid_token');

            expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith('valid_token');
            expect(mockUserRepo.createCustomer).toHaveBeenCalled();
            expect(result.user.isNewUser).toBe(true);
            expect(result.token).toBeDefined(); // JWT is generated
        });

        it('returns existing user if Firebase UID matches an active user', async () => {
            const mockDecodedToken = {
                uid: 'test_uid',
                phone_number: '+919876543210',
            };

            (firebaseAuth.verifyIdToken as any).mockResolvedValue(mockDecodedToken);

            const existingUser: User = {
                id: 'user_123',
                role: 'customer',
                mobile: '+919876543210',
                mobile_hash: 'hashed',
                firebase_uid: 'test_uid',
                is_deleted: false,
                name: null,
                email: null,
            };

            // Simulate existing user
            mockUserRepo.findByFirebaseUid.mockResolvedValue(existingUser);

            const result = await authService.verifyFirebaseToken('valid_token');

            expect(mockUserRepo.createCustomer).not.toHaveBeenCalled();
            expect(result.user.isNewUser).toBe(false);
            expect(result.user.id).toBe(existingUser.id);
        });

        it('throws VALIDATION_ERROR if token has no phone_number', async () => {
            (firebaseAuth.verifyIdToken as any).mockResolvedValue({
                uid: 'test_uid',
                // phone_number deliberately missing
            });

            await expect(authService.verifyFirebaseToken('token_without_phone')).rejects.toThrow(AppError);
            try {
                await authService.verifyFirebaseToken('token_without_phone');
            } catch (err: any) {
                expect(err.code).toBe('VALIDATION_ERROR');
            }
        });

        it('throws JWT_INVALID if Firebase token verification fails natively', async () => {
            const fbError = new Error('Token expired');
            (fbError as any).code = 'auth/id-token-expired';

            (firebaseAuth.verifyIdToken as any).mockRejectedValue(fbError);

            await expect(authService.verifyFirebaseToken('expired_token')).rejects.toThrow(AppError);

            try {
                await authService.verifyFirebaseToken('expired_token');
            } catch (err: any) {
                expect(err.code).toBe('JWT_INVALID');
            }
        });
    });

    describe('generateOtp', () => {
        it('should generate a 6-digit OTP and store it in Redis with 120s TTL', async () => {
            const mobile = '9876543210';
            const redis = getRedisClient();

            await authService.generateOtp(mobile);

            expect(redis.set).toHaveBeenCalledWith(
                `otp:${mobile}`,
                expect.stringMatching(/^\d{6}$/),
                'EX',
                120
            );
        });
    });

    describe('deleteAccount (DPDPA)', () => {
        it('calls softDeleteCustomer and revokes Firebase sessions', async () => {
            const existingUser: User = {
                id: 'user_123',
                role: 'customer',
                mobile: '+919876543210',
                mobile_hash: 'hashed',
                firebase_uid: 'test_uid',
                is_deleted: false,
                name: null,
                email: null,
            };

            mockUserRepo.findById.mockResolvedValue(existingUser);
            mockUserRepo.softDeleteCustomer.mockResolvedValue();

            await authService.deleteAccount('user_123');

            expect(mockUserRepo.softDeleteCustomer).toHaveBeenCalledWith('user_123');
            expect(firebaseAuth.revokeRefreshTokens).toHaveBeenCalledWith('test_uid');
            expect(firebaseAuth.deleteUser).toHaveBeenCalledWith('test_uid');
        });

        it('throws NOT_FOUND if user does not exist', async () => {
            mockUserRepo.findById.mockResolvedValue(null);

            await expect(authService.deleteAccount('invalid_id')).rejects.toThrow(AppError);
        });
    });
});
