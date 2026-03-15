import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { VerifyOtpSchema, LoginOtpSchema, AdminLoginFailureSchema } from '../schemas/auth.schemas';
import { catchAsync, setAuthCookie, clearAuthCookie } from '@fs/shared';

export class AuthController {
    constructor(private readonly authService: AuthService) { }

    loginOtp = catchAsync(async (req: Request, res: Response) => {
        const dto = LoginOtpSchema.parse(req.body);
        await this.authService.generateOtp(dto.mobile);
        return res.status(200).json({ success: true, message: 'OTP sent successfully' });
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

        // 3. Set secure HttpOnly cookie
        setAuthCookie(res, result.token);

        return res.status(200).json({
            success: true,
            data: {
                user: result.user
            }
        });
    });

    logout = catchAsync(async (_req: Request, res: Response) => {
        clearAuthCookie(res);
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    });

    me = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: { code: 'JWT_INVALID', message: 'Not authenticated' } });
        }

        return res.status(200).json({
            success: true,
            data: { user: req.user }
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
        const dto = AdminLoginFailureSchema.parse(req.body);
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || null;
        const result = await this.authService.recordAdminLoginFailure(dto.mobile, ipAddress, dto.reason);
        return res.status(200).json({ success: true, data: result });
    });
}
