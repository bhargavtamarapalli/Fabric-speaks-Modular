import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { 
  AdminListQuerySchema, 
  AuditLogQuerySchema, 
  ChangeRoleSchema 
} from '../schemas/admin.schemas';
import { z } from 'zod';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';

export class AdminController {
  constructor(private adminService: AdminService) {}

  listAdminUsers = catchAsync(async (req: Request, res: Response) => {
    const filters = AdminListQuerySchema.parse(req.query);
    const result = await this.adminService.listAdminUsers(filters);
    res.json({ success: true, data: { items: result.items }, meta: result.meta });
  });

  createAdminUser = catchAsync(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(2).max(100),
      mobile: z.string().regex(/^[6-9]\d{9}$/),
      role: z.enum(['customer', 'inventoryManager', 'supportAgent', 'superAdmin'])
    });
    const dto = schema.parse(req.body);
    const adminUserId = req.user?.userId;
    if (!adminUserId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.adminService.createAdminUser(dto, adminUserId);
    res.status(201).json({ success: true, data: result });
  });

  updateAdminRole = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = ChangeRoleSchema.parse(req.body);
    const adminUserId = req.user?.userId;
    if (!adminUserId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.adminService.updateAdminRole(id!, role, adminUserId);
    res.json({ success: true, data: result });
  });

  deleteAdminUser = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminUserId = req.user?.userId;
    if (!adminUserId) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.adminService.deleteAdminUser(id!, adminUserId);
    res.json({ success: true, data: result });
  });

  getAuditLogs = catchAsync(async (req: Request, res: Response) => {
    const filters = AuditLogQuerySchema.parse(req.query);
    const result = await this.adminService.getAuditLogs(filters);
    res.json({ success: true, data: { items: result.items }, meta: result.meta });
  });

  getDashboardOps = catchAsync(async (req: Request, res: Response) => {
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
  });
}
