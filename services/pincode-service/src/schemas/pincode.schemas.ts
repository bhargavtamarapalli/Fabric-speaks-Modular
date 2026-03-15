import { z } from 'zod';

export const PincodeParamSchema = z.object({
  pincode: z.string().length(6, 'Pincode must be exactly 6 digits').regex(/^\d{6}$/, 'Pincode must be numeric'),
});

export const BulkPincodeUploadSchema = z.object({
  csvData: z.string().min(1, 'CSV data is required'),
});

export type BulkPincodeUploadDto = z.infer<typeof BulkPincodeUploadSchema>;
