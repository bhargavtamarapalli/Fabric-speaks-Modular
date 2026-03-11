import { adminUserRepository } from '../repositories/admin-user.repository';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { AdminListQueryDto, AuditLogQueryDto } from '../schemas/admin.schemas';

export class AdminService {
  async listAdminUsers(filters: AdminListQueryDto) {
    return adminUserRepository.list(filters);
  }

  async getAuditLogs(filters: AuditLogQueryDto) {
    return auditLogRepository.list(filters);
  }

  async createAdminUser(data: { name: string; mobile: string; role: string }, adminId: string) {
    // Check if mobile already exists
    // (We skip explicit uniqueness check here assuming DB constraint, but let's handle via AppError if it fails)
    try {
      const user = await adminUserRepository.create(data);
      
      // RULE 6
      await auditLogRepository.insert({
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

    const previousUser = await adminUserRepository.findById(userId);
    if (!previousUser) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

    const updated = await adminUserRepository.updateRole(userId, targetRole);
    
    // RULE 6
    await auditLogRepository.insert({
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

    const deleted = await adminUserRepository.softDelete(userId);
    if (!deleted) throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

    // RULE 6
    await auditLogRepository.insert({
      adminId,
      action: 'admin_user_delete',
      targetType: 'user',
      targetId: userId,
    });

    return { deleted: true };
  }
}

export const adminService = new AdminService();
