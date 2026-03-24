import { z } from 'zod';

// --- Common Base Schemas ---

export const mobileSchema = z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

export const otpSchema = z.string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d+$/, 'OTP must be numeric');

export const pincodeSchema = z.string()
    .length(6, 'Pincode must be 6 digits')
    .regex(/^\d+$/, 'Pincode must be numeric');

export const uuidSchema = z.string().uuid();

// --- Auth Schemas ---

export const loginRequestSchema = z.object({
    mobile: mobileSchema,
});

export const verifyOtpRequestSchema = z.object({
    mobile: mobileSchema,
    otp: otpSchema,
});

// --- Order/Cart Schemas ---

export const cartItemSchema = z.object({
    variantId: uuidSchema,
    quantity: z.number().int().positive(),
});

// --- Pagination Schema ---

export const paginationSchema = z.object({
    page: z.number().int().nonnegative().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(20),
});

export const PaginationSchema = paginationSchema;
