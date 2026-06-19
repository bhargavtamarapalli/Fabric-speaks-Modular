import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { 
  AdminListQuerySchema, 
  AuditLogQuerySchema, 
  ChangeRoleSchema,
  CreateAdminUserSchema,
  CustomerLookupSchema,
  IdParamSchema
} from '../schemas/admin.schemas';
import { z } from 'zod';
import { AppError, ErrorCode, catchAsync } from '@fs/shared';

export class AdminController {
  constructor(private adminService: AdminService) {}

  listAdminUsers = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as Record<string, unknown> & {
      filter?: { role?: string; search?: string };
    };

    // Express can parse filter[role] as either literal key or nested filter.role.
    const normalizedQuery = {
      page: query.page,
      limit: query.limit,
      'filter[role]': (query['filter[role]'] as string | undefined) ?? query.filter?.role,
      'filter[search]': (query['filter[search]'] as string | undefined) ?? query.filter?.search,
    };

    const filters = AdminListQuerySchema.parse(normalizedQuery);
    const requesterRole = req.user?.role;
    if (!requesterRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const result = await this.adminService.listAdminUsers(filters, requesterRole);
    res.json({ success: true, data: { items: result.items, meta: result.meta }, meta: result.meta });
  });

  createAdminUser = catchAsync(async (req: Request, res: Response) => {
    const dto = CreateAdminUserSchema.parse(req.body);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.adminService.createAdminUser(dto, adminId, adminRole);
    res.status(201).json({ success: true, data: result });
  });

  updateAdminRole = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const { role } = ChangeRoleSchema.parse(req.body);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.adminService.updateAdminRole(id, role, adminId, adminRole);
    res.json({ success: true, data: result });
  });

  deleteAdminUser = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;
    
    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.adminService.deleteAdminUser(id, adminId, adminRole);
    res.json({ success: true, data: result });
  });

  resetAdminSession = catchAsync(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const adminId = req.user?.userId;
    const adminRole = req.user?.role;

    if (!adminId || !adminRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');

    const result = await this.adminService.resetAdminSession(id, adminId, adminRole);
    res.json({ success: true, data: result });
  });

  getAuditLogs = catchAsync(async (req: Request, res: Response) => {
    const filters = AuditLogQuerySchema.parse(req.query);
    const result = await this.adminService.getAuditLogs(filters);
    res.json({ success: true, data: { items: result.items }, meta: result.meta });
  });

  getDashboardOps = catchAsync(async (req: Request, res: Response) => {
    const result = await this.adminService.getDashboardMetrics();
    res.json({ success: true, data: result });
  });

  lookupCustomers = catchAsync(async (req: Request, res: Response) => {
    const { q } = CustomerLookupSchema.parse(req.query);
    const requesterRole = req.user?.role;
    if (!requesterRole) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const result = await this.adminService.lookupCustomers(q, requesterRole);
    res.json({ success: true, data: result });
  });
}
