import { AdminUserRepository, AdminUser } from '../repositories/admin-user.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared';
import { AdminListQueryDto, AuditLogQueryDto } from '../schemas/admin.schemas';

export class AdminService {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private auditLogRepo: AuditLogRepository
  ) {}

  async listAdminUsers(filters: AdminListQueryDto) {
    return this.adminUserRepo.list(filters);
  }

  async getAuditLogs(filters: AuditLogQueryDto) {
    return this.auditLogRepo.list(filters);
  }

  async createAdminUser(data: { name: string; mobile: string; role: string }, adminId: string) {
    try {
      const user = await this.adminUserRepo.create(data);
      
      await this.auditLogRepo.insert({
        adminId,
        action: 'admin_user_create',
        targetType: 'user',
        targetId: user.id,
        payload: { name: user.name, role: user.role }
      });
      
      return user;
    } catch (e: any) {
      if (e.code === '23505') throw new AppError(ErrorCode.VALIDATION_ERROR, 'Mobile already registered');
      throw e;
    }
  }

  async updateAdminRole(userId: string, targetRole: string, adminId: string) {
    if (userId === adminId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot change your own role');
    }

    const previousUser = await this.adminUserRepo.findById(userId);
    if (!previousUser) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

    const updated = await this.adminUserRepo.updateRole(userId, targetRole);
    
    await this.auditLogRepo.insert({
      adminId,
      action: 'admin_role_change',
      targetType: 'user',
      targetId: userId,
      payload: { previousRole: previousUser.role, newRole: targetRole }
    });

    return updated;
  }

  async deleteAdminUser(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot delete your own account');
    }

    const deleted = await this.adminUserRepo.softDelete(userId);
    if (!deleted) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

    await this.auditLogRepo.insert({
      adminId,
      action: 'admin_user_delete',
      targetType: 'user',
      targetId: userId,
    });

    return { deleted: true };
  }
}
