import { Request, Response } from 'express';
import { supportService } from '../services/support.service';
import { CustomerViewService } from '../services/customer-view.service';
import { 
  CustomerLookupQuerySchema, 
  SupportQueueQuerySchema, 
  UpdateQuerySchema 
} from '../schemas/support.schemas';

export async function getQueue(req: Request, res: Response): Promise<void> {
  const filters = SupportQueueQuerySchema.parse(req.query);
  const result = await supportService.getQueue(filters);
  res.json({ success: true, data: { items: result.items }, meta: result.meta });
}

export async function getCaseDetail(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const result = await supportService.getCaseDetail(caseId);
  res.json({ success: true, data: result });
}

export async function updateCaseStatus(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const dto = UpdateQuerySchema.parse(req.body);
  const result = await supportService.updateCase(caseId, dto, req.user!.userId);
  res.json({ success: true, data: result });
}

export async function getCustomerLookup(req: Request, res: Response): Promise<void> {
  const { mobile } = CustomerLookupQuerySchema.parse(req.params);
  const result = await CustomerViewService.getCustomer360ByMobile(mobile);
  res.json({ success: true, data: result });
}

export async function postInternalNote(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const dto = UpdateQuerySchema.parse(req.body);
  if (!dto.note) throw new Error('Note text is required');

  const result = await supportService.addNote(caseId, dto.note, req.user!.userId);
  res.status(201).json({ success: true, data: result });
}
