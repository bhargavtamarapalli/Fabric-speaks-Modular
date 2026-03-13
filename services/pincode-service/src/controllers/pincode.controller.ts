import { Request, Response } from 'express';
import { PincodeService } from '../services/pincode.service';
import { PincodeParamSchema, BulkPincodeUploadSchema } from '../schemas/pincode.schemas';
import { catchAsync } from '@fs/shared';

export class PincodeController {
    constructor(private readonly pincodeService: PincodeService) {}

    getServiceability = catchAsync(async (req: Request, res: Response) => {
        const { pincode } = PincodeParamSchema.parse(req.params);
        const result = await this.pincodeService.getServiceability(pincode);
        res.json({ success: true, data: result });
    });

    bulkUpload = catchAsync(async (req: Request, res: Response) => {
        const dto = BulkPincodeUploadSchema.parse(req.body);
        const result = await this.pincodeService.processBulkUpload(dto.csvData);
        res.json({ success: true, data: result });
    });
}
