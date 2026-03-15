import { Request, Response } from 'express';
import { PincodeService } from '../services/pincode.service';
import { PincodeParamSchema, BulkPincodeUploadSchema } from '../schemas/pincode.schemas';
import { catchAsync, AppError, ErrorCode } from '@fs/shared';

export class PincodeController {
    constructor(private readonly pincodeService: PincodeService) {}

    getServiceability = catchAsync(async (req: Request, res: Response) => {
        const { pincode } = PincodeParamSchema.parse(req.params);
        const result = await this.pincodeService.getServiceability(pincode);
        res.json({ success: true, data: result });
    });

    bulkUpload = catchAsync(async (req: Request, res: Response) => {
        const dto = BulkPincodeUploadSchema.parse(req.body);
        const adminId = req.user?.userId;
        if (!adminId) {
            throw new AppError(ErrorCode.JWT_INVALID, 'Unauthorized');
        }
        const result = await this.pincodeService.processBulkUpload(dto.csvData, adminId);
        res.json({ success: true, data: result });
    });
}
