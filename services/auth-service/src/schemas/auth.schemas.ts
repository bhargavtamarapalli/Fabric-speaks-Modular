import { z } from 'zod';
import { mobileSchema } from '@fs/shared';

export const LoginOtpSchema = z.object({
    mobile: mobileSchema,
});

export const VerifyOtpSchema = z.object({
    idToken: z.string().min(1, 'Firebase ID Token is required'),
});

export const AdminLoginFailureSchema = z.object({
    mobile: mobileSchema,
    reason: z.string().max(200).optional()
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;
