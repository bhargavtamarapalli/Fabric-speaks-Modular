import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { VerifyOtpSchema, LoginOtpSchema, VerifyOtpCodeSchema, AdminLoginFailureSchema, RegisterSchema, LoginSchema, GoogleLoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../schemas/auth.schemas';
import { catchAsync, setAuthCookie, clearAuthCookie, AppError, ErrorCode } from '@fs/shared';
import * as bcrypt from 'bcryptjs';

export class AuthController {
    constructor(private readonly authService: AuthService) { }

    loginOtp = catchAsync(async (req: Request, res: Response) => {
        const dto = LoginOtpSchema.parse(req.body);
        await this.authService.generateOtp(dto.mobile);
        return res.status(200).json({ success: true, message: 'OTP sent successfully' });
    });

    /**
     * Verifies 6-digit OTP and creates/logs in user with account unification
     */
    verifyOtp = catchAsync(async (req: Request, res: Response) => {
        // 1. Validate Input
        const dto = VerifyOtpCodeSchema.parse(req.body);

        // 2. Core Logic
        const result = await this.authService.verifyOtp(dto.mobile, dto.otp);

        // 3. Set secure HttpOnly cookies
        setAuthCookie(res, result.accessToken, result.refreshToken);

        return res.status(200).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken
            }
        });
    });

    /**
     * Validates Firebase ID Token sent from the React client.
     * Creates the user profile if it doesn't exist.
     * Sets the HttpOnly JWT session cookie.
     */
    verifyFirebaseToken = catchAsync(async (req: Request, res: Response) => {
        // 1. Validate Input
        const dto = VerifyOtpSchema.parse(req.body);

        // 2. Core Logic
        const result = await this.authService.verifyFirebaseToken(dto.idToken);

        // 3. Set secure HttpOnly cookies
        setAuthCookie(res, result.accessToken, result.refreshToken);

        return res.status(200).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken
            }
        });
    });

    register = catchAsync(async (req: Request, res: Response) => {
        const dto = RegisterSchema.parse(req.body);

        // Hash password before service
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(dto.password, salt);

        const result = await this.authService.registerWithEmail({
            email: dto.email,
            name: dto.name,
            passwordHash
        });

        if (dto.mobile) {
            await this.authService.updateProfile(result.user.id, { mobile: dto.mobile });
        }

        setAuthCookie(res, result.accessToken, result.refreshToken);

        return res.status(201).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken
            }
        });
    });

    login = catchAsync(async (req: Request, res: Response) => {
        const dto = LoginSchema.parse(req.body);
        const result = await this.authService.loginWithEmail({
            email: dto.email,
            passwordRaw: dto.password
        });

        setAuthCookie(res, result.accessToken, result.refreshToken);

        return res.status(200).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken
            }
        });
    });

    loginGoogle = catchAsync(async (req: Request, res: Response) => {
        const dto = GoogleLoginSchema.parse(req.body);
        console.log(`[AUTH_CTRL] loginGoogle called for token: ${dto.idToken.slice(0, 10)}...`);
        const result = await this.authService.loginWithGoogle(dto.idToken);
        console.log(`[AUTH_CTRL] loginGoogle success for user: ${result.user.id}`);

        setAuthCookie(res, result.accessToken, result.refreshToken);

        return res.status(200).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken
            }
        });
    });

    refresh = catchAsync(async (req: Request, res: Response) => {
        // Try getting token from body or cookie
        const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
        console.log(`[AUTH_CTRL] refresh called. Token present in body: ${!!req.body.refreshToken}, in cookies: ${!!req.cookies.refreshToken}`);

        if (!refreshToken) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Refresh token missing');
        }

        const tokens = await this.authService.refreshToken(refreshToken);

        setAuthCookie(res, tokens.accessToken, tokens.refreshToken);

        return res.status(200).json({
            success: true,
            data: {
                accessToken: tokens.accessToken
            }
        });
    });

    logout = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        // Revoke all refresh tokens for this user to prevent reuse
        if (userId) {
            await this.authService.revokeAllTokens(userId);
        }

        clearAuthCookie(res);
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    });

    me = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: { code: 'JWT_INVALID', message: 'Not authenticated' } });
        }

        // req.user has shape { userId, role, mobile } - map to AuthUser shape { id, role, mobile }
        const user = await this.authService.getUserById(req.user.userId);

        return res.status(200).json({
            success: true,
            data: {
                id: req.user.userId,
                role: req.user.role,
                mobile: req.user.mobile,
                name: user?.name ?? null,
                email: user?.email ?? null,
            }
        });
    });

    getProfile = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated');
        }

        const user = await this.authService.getUserById(userId);
        if (!user) {
            throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
        }

        return res.status(200).json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                whatsapp_enabled: user.whatsapp_enabled
            }
        });
    });

    updateProfile = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated');
        }

        const updated = await this.authService.updateProfile(userId, req.body);

        return res.status(200).json({
            success: true,
            data: {
                name: updated.name,
                email: updated.email,
                mobile: updated.mobile,
                whatsapp_enabled: updated.whatsapp_enabled
            }
        });
    });

    changePassword = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated');

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'Current and new passwords are required');
        }

        await this.authService.changePassword(userId, currentPassword, newPassword);

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    });

    deleteAccount = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: { code: 'JWT_INVALID', message: 'Not authenticated' } });
        }

        await this.authService.deleteAccount(userId);

        clearAuthCookie(res);
        return res.status(200).json({
            success: true,
            message: 'Account permanently deleted'
        });
    });

    recordAdminLoginFailure = catchAsync(async (req: Request, res: Response) => {
        // Parse and validate IP address from headers
        let ipAddress: string | null = null;
        const xForwardedFor = req.headers['x-forwarded-for'];

        if (typeof xForwardedFor === 'string') {
            const ips = xForwardedFor.split(',').map(ip => ip.trim());
            if (ips.length > 0 && ips[0]) {
                ipAddress = ips[0];
            }
        } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
            ipAddress = xForwardedFor[0] ?? null;
        } else if (req.ip) {
            ipAddress = req.ip;
        }

        const dto = AdminLoginFailureSchema.parse(req.body);
        const result = await this.authService.recordAdminLoginFailure(dto.mobile, ipAddress, dto.reason);
        return res.status(200).json({ success: true, data: result });
    });

    forgotPassword = catchAsync(async (req: Request, res: Response) => {
        const dto = ForgotPasswordSchema.parse(req.body);
        await this.authService.requestPasswordReset(dto.email);

        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a reset code has been sent.'
        });
    });

    resetPassword = catchAsync(async (req: Request, res: Response) => {
        const dto = ResetPasswordSchema.parse(req.body);
        await this.authService.resetPassword({
            email: dto.email,
            otp: dto.otp,
            passwordRaw: dto.password
        });

        return res.status(200).json({
            success: true,
            message: 'Password as been reset successfully. Please login with your new password.'
        });
    });

    /**
     * DEV-ONLY: Promote a user to admin by email.
     * In production this endpoint is disabled.
     */
    promoteUser = catchAsync(async (req: Request, res: Response) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not available in production' } });
        }

        const { email, role } = req.body as { email: string; role: string };
        if (!email || !role) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email and role are required' } });
        }

        const validRoles = ['customer', 'supportAgent', 'inventoryManager', 'superAdmin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `role must be one of: ${validRoles.join(', ')}` } });
        }

        const user = await this.authService.promoteUser(email, role);
        return res.status(200).json({
            success: true,
            data: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    });
}

