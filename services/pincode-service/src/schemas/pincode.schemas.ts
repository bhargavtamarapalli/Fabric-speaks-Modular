import { z } from 'zod';

export const PincodeParamSchema = z.object({
  pincode: z.string().min(6).max(10).regex(/^\d+$/, 'Pincode must be numeric'),
});

export const BulkPincodeUploadSchema = z.object({
  csvData: z.string().min(1, 'CSV data is required'),
});

export type BulkPincodeUploadDto = z.infer<typeof BulkPincodeUploadSchema>;
