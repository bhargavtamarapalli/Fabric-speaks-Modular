import { z } from 'zod';
import { mobileSchema, otpSchema } from '@fs/shared';

export const VerifyOtpSchema = z.object({
    idToken: z.string().min(1, 'Firebase ID Token is required'),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;
