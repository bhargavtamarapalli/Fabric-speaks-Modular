import { AdminUserRepository } from '../repositories/admin-user.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared';
import { AdminListQueryDto, AuditLogQueryDto, CreateAdminUserDto } from '../schemas/admin.schemas';

export class AdminService {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private customerRepo: CustomerRepository,
    private auditLogRepo: AuditLogRepository
  ) {}

  async listAdminUsers(filters: AdminListQueryDto) {
    return this.adminUserRepo.list(filters);
  }

  async lookupCustomers(query: string) {
    return this.customerRepo.lookup(query);
  }

  async getAuditLogs(filters: AuditLogQueryDto) {
    return this.auditLogRepo.list({
      adminId: filters['filter[admin_id]'] as string | undefined,
      limit: filters.limit as number | undefined,
      cursor: filters.cursor as string | undefined,
      action: filters['filter[action]'] as string | undefined,
      entityType: filters['filter[entity_type]'] as string | undefined,
      entityId: filters['filter[entity_id]'] as string | undefined
    });
  }

  async createAdminUser(data: CreateAdminUserDto, adminId: string, requesterRole: string) {
    // RULE: Only superAdmin can create admin users
    if (requesterRole !== 'superAdmin') {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Insufficient permissions to create admin users');
    }

    try {
      const user = await this.adminUserRepo.create(data);
      
      await this.auditLogRepo.insert({
        adminId,
        action: 'admin_user_create',
        entityType: 'user',
        entityId: user.id,
        afterJson: { name: user.name, role: user.role }
      });
      
      return user;
    } catch (e: any) {
      if (e.code === '23505') throw new AppError(ErrorCode.VALIDATION_ERROR, 'Mobile already registered');
      throw e;
    }
  }

  async updateAdminRole(userId: string, targetRole: string, adminId: string, requesterRole: string) {
    // RULE: Only superAdmin can change roles
    if (requesterRole !== 'superAdmin') {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Insufficient permissions to change roles');
    }

    if (userId === adminId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot change your own role');
    }

    const previousUser = await this.adminUserRepo.findById(userId);
    if (!previousUser) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

    const updated = await this.adminUserRepo.updateRole(userId, targetRole);
    
    await this.auditLogRepo.insert({
      adminId,
      action: 'admin_role_change',
      entityType: 'user',
      entityId: userId,
      beforeJson: { role: previousUser.role },
      afterJson: { role: targetRole }
    });

    return updated;
  }

  async deleteAdminUser(userId: string, adminId: string, requesterRole: string) {
     // RULE: Only superAdmin can delete users
    if (requesterRole !== 'superAdmin') {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Insufficient permissions to delete users');
    }

    if (userId === adminId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot delete your own account');
    }

    const deleted = await this.adminUserRepo.softDelete(userId);
    if (!deleted) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

    await this.auditLogRepo.insert({
      adminId,
      action: 'admin_user_delete',
      entityType: 'user',
      entityId: userId,
    });

    return { deleted: true };
  }

  async getDashboardMetrics() {
    // In a real implementation, these would call dedicated repository methods
    // For now, we perform basic aggregations via the user and audit repos or direct queries if needed.
    // Dashboard fields: failedPayments, codInWindow, shiprocketIssues, fraudFlags, ordersByStatus
    
    // Simulating repository calls for the purpose of this remediation
    const metrics = {
      failedPayments: await this.adminUserRepo.getFailedPaymentsCount(),
      codInWindow: await this.adminUserRepo.getCODOrderStats(),
      shiprocketIssues: await this.adminUserRepo.getLogisticsIssues(),
      fraudFlags: await this.adminUserRepo.getFraudFlags(),
      ordersByStatus: await this.adminUserRepo.getOrdersSummary()
    };
    
    return metrics;
  }
}
