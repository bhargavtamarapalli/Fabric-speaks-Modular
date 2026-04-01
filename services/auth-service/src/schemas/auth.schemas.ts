import { z } from 'zod';
import { mobileSchema } from '@fs/shared';

export const LoginOtpSchema = z.object({
    mobile: mobileSchema,
});

export const VerifyOtpSchema = z.object({
    idToken: z.string().min(1, 'Firebase ID Token is required'),
});

/**
 * Schema for OTP verification (6-digit code + mobile)
 */
export const VerifyOtpCodeSchema = z.object({
    mobile: mobileSchema,
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type VerifyOtpCodeDto = z.infer<typeof VerifyOtpCodeSchema>;

export const RegisterSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    mobile: mobileSchema.optional(),
});

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const GoogleLoginSchema = z.object({
    idToken: z.string().min(1, 'Google ID Token is required'),
});

export const RefreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const AdminLoginFailureSchema = z.object({
    mobile: mobileSchema,
    reason: z.string().max(200).optional()
});

export const ForgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address')
});

export const ResetPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters')
});

export const UpdateProfileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    mobile: mobileSchema.optional(),
    whatsapp_enabled: z.boolean().optional(),
    preferences: z.record(z.any()).optional(),
});

export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
