import { Request, Response } from 'express';
import { SupportService } from '../services/support.service';
import { CustomerViewService } from '../services/customer-view.service';
import { 
  CustomerLookupQuerySchema, 
  SupportQueueQuerySchema, 
  UpdateQuerySchema 
} from '../schemas/support.schemas';
import { catchAsync, AppError, ErrorCode } from '@fs/shared';

export class SupportController {
  constructor(
    private supportService: SupportService,
    private customerViewService: CustomerViewService
  ) {}

  getQueue = catchAsync(async (req: Request, res: Response) => {
    const filters = SupportQueueQuerySchema.parse(req.query);
    const result = await this.supportService.getQueue(filters);
    res.json({ success: true, data: { items: result.items }, meta: result.meta });
  });

  getCaseDetail = catchAsync(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const result = await this.supportService.getCaseDetail(caseId!);
    res.json({ success: true, data: result });
  });

  updateCaseStatus = catchAsync(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const dto = UpdateQuerySchema.parse(req.body);
    const result = await this.supportService.updateCase(caseId!, dto, req.user!.userId);
    res.json({ success: true, data: result });
  });

  getCustomerLookup = catchAsync(async (req: Request, res: Response) => {
    const { mobile } = CustomerLookupQuerySchema.parse(req.params);
    const result = await this.customerViewService.getCustomer360ByMobile(mobile);
    res.json({ success: true, data: result });
  });

  postInternalNote = catchAsync(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const dto = UpdateQuerySchema.parse(req.body);
    if (!dto.note) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Note text is required');

    const result = await this.supportService.addNote(caseId!, dto.note, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  });
}
