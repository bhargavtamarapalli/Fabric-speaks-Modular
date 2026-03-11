import { Request, Response, NextFunction } from 'express';
import { PincodeService } from '../services/pincode.service';
import { PincodeParamSchema, BulkPincodeUploadSchema } from '../schemas/pincode.schemas';

export class PincodeController {
    constructor(private readonly pincodeService: PincodeService) {}

    getServiceability = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { pincode } = PincodeParamSchema.parse(req.params);
            const result = await this.pincodeService.getServiceability(pincode);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    bulkUpload = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = BulkPincodeUploadSchema.parse(req.body);
            const result = await this.pincodeService.processBulkUpload(dto.csvData);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };
}
