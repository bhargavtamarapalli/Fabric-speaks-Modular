import { AdminUserRepository } from '../repositories/admin-user.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { AppError, ErrorCode, getRedisClient, logger } from '@fs/shared';
import { AdminListQueryDto, AuditLogQueryDto, CreateAdminUserDto } from '../schemas/admin.schemas';
import { Queue } from 'bullmq';

export class AdminService {
  private eventQueue: Queue;

  constructor(
    private adminUserRepo: AdminUserRepository,
    private customerRepo: CustomerRepository,
    private auditLogRepo: AuditLogRepository,
    private dashboardRepo: DashboardRepository,
    eventQueue?: Queue
  ) {
    this.eventQueue = eventQueue ?? new Queue('platform_events', { connection: getRedisClient() });
  }

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

      this.enqueueEvent('admin.user_created', {
        adminId: user.id,
        adminName: user.name,
        role: user.role,
        createdBy: adminId
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

  async resetAdminSession(userId: string, adminId: string, requesterRole: string) {
    if (requesterRole !== 'superAdmin') {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Insufficient permissions to reset sessions');
    }

    const reset = await this.adminUserRepo.resetSession(userId);

    await this.auditLogRepo.insert({
      adminId,
      action: 'admin_session_reset',
      entityType: 'user',
      entityId: userId,
      afterJson: { sessionVersion: reset.sessionVersion, revokedAt: reset.revokedAt }
    });

    return reset;
  }

  async getDashboardMetrics() {
    const [revenue, trends, topProducts, topFabrics, codStats, failedPayments, funnel, health, abandonedRate, dailyComparison, weeklyComparison, shiprocketIssues] = await Promise.all([
      this.dashboardRepo.getRevenueMetrics(30),
      this.dashboardRepo.getOrderTrends(30),
      this.dashboardRepo.getTopProducts(5),
      this.dashboardRepo.getTopFabrics(5),
      this.dashboardRepo.getCODStats(),
      this.dashboardRepo.getFailedPaymentsCount(),
      this.dashboardRepo.getConversionFunnel(30),
      this.dashboardRepo.getSystemHealth(),
      this.dashboardRepo.getAbandonedCartRate(),
      this.dashboardRepo.getPeriodComparison(1),
      this.dashboardRepo.getPeriodComparison(7),
      this.dashboardRepo.getShiprocketIssues(6)
    ]);
    
    return {
      revenue,
      trends,
      topProducts,
      topFabrics,
      cod: codStats,
      failedPayments,
      funnel,
      health,
      abandonedRate,
      comparisons: {
        yesterday: dailyComparison,
        week: weeklyComparison
      },
      shiprocketIssues,
      fraudFlags: codStats.fraud_flagged
    };
  }

  private enqueueEvent(name: string, payload: Record<string, unknown>): void {
    void this.eventQueue.add(name, payload).catch((error) => {
      logger.warn(`[AdminService] Failed to enqueue ${name}`, error);
    });
  }
}
