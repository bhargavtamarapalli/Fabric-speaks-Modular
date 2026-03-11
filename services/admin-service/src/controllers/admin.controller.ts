import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { 
  AdminListQuerySchema, 
  AuditLogQuerySchema, 
  ChangeRoleSchema 
} from '../schemas/admin.schemas';
import { z } from 'zod';

export async function listAdminUsers(req: Request, res: Response): Promise<void> {
  const filters = AdminListQuerySchema.parse(req.query);
  const result = await adminService.listAdminUsers(filters);
  res.json({ success: true, data: { items: result.items }, meta: result.meta });
}

export async function createAdminUser(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    name: z.string().min(2).max(100),
    mobile: z.string().regex(/^[6-9]\d{9}$/),
    role: z.enum(['customer', 'inventoryManager', 'supportAgent', 'superAdmin']) // usually non-customer
  });
  const dto = schema.parse(req.body);
  const result = await adminService.createAdminUser(dto, req.user!.userId);
  res.status(201).json({ success: true, data: result });
}

export async function updateAdminRole(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { role } = ChangeRoleSchema.parse(req.body);
  const result = await adminService.updateAdminRole(id, role, req.user!.userId);
  res.json({ success: true, data: result });
}

export async function deleteAdminUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await adminService.deleteAdminUser(id, req.user!.userId);
  res.json({ success: true, data: result });
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const filters = AuditLogQuerySchema.parse(req.query);
  const result = await adminService.getAuditLogs(filters);
  res.json({ success: true, data: { items: result.items }, meta: result.meta });
}

// ADM-06: Daily Ops Dashboard stub (Would normally merge redis/pg states across microservices)
export async function getDashboardOps(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: {
      failedPayments: [],
      codInWindow: [],
      shiprocketIssues: [],
      fraudFlags: [],
      ordersByStatus: { "PLACED": 12, "CONFIRMED": 34, "PACKED": 8, "SHIPPED": 45, "DELIVERED": 120 }
    }
  });
}
