import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { VerifyOtpSchema } from '../schemas/auth.schemas';

export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * Validates Firebase ID Token sent from the React client.
     * Creates the user profile if it doesn't exist.
     * Sets the HttpOnly JWT session cookie.
     */
    async verifyFirebaseToken(req: Request, res: Response) {
        // 1. Validate Input
        const dto = VerifyOtpSchema.parse(req.body);

        // 2. Core Logic
        const result = await this.authService.verifyFirebaseToken(dto.idToken);

        // 3. Set secure HttpOnly cookie
        res.cookie('jwt', result.token, {
            httpOnly: true,
            secure: process.env.APP_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(200).json({
            success: true,
            data: {
                user: result.user
            }
        });
    }

    /**
     * Logs out the user by clearing the JWT cookie.
     */
    async logout(req: Request, res: Response) {
        res.clearCookie('jwt');
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    }

    /**
     * Returns current user identity. Requires auth middleware.
     */
    async me(req: Request, res: Response) {
        // @ts-ignore req.user is populated by shared authMiddleware
        if (!req.user) {
            return res.status(401).json({ success: false, error: { code: 'JWT_INVALID', message: 'Not authenticated' } });
        }

        return res.status(200).json({
            success: true,
            // @ts-ignore
            data: { user: req.user }
        });
    }

    /**
     * DPDPA Right to Erasure.
     * Permanently soft deletes profile and revokes all sessions. 
     */
    async deleteAccount(req: Request, res: Response) {
        // @ts-ignore req.user is populated by shared authMiddleware
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: { code: 'JWT_INVALID', message: 'Not authenticated' } });
        }

        await this.authService.deleteAccount(userId);

        res.clearCookie('jwt');
        return res.status(200).json({
            success: true,
            message: 'Account permanently deleted'
        });
    }
}
