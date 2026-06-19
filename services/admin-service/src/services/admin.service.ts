import { AdminUserRepository } from '../repositories/admin-user.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { AppError, ErrorCode, getRedisClient, logger } from '@fs/shared';
import { AdminListQueryDto, AuditLogQueryDto, CreateAdminUserDto } from '../schemas/admin.schemas';
import { Queue } from 'bullmq';
import admin from 'firebase-admin';

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

  async listAdminUsers(filters: AdminListQueryDto, requesterRole: string) {
    const mappedFilters = {
      page: filters.page,
      limit: filters.limit,
      role: filters['filter[role]'],
      search: filters['filter[search]'],
    };

    if (requesterRole === 'superAdmin') {
      return this.adminUserRepo.list(mappedFilters);
    }

    if (requesterRole === 'inventoryManager') {
      return this.adminUserRepo.list({
        ...mappedFilters,
        role: 'inventoryManager',
      });
    }

    if (requesterRole === 'supportAgent') {
      return this.adminUserRepo.list({
        ...mappedFilters,
        role: 'supportAgent',
      });
    }

    throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Insufficient permissions to view admin users');
  }

  async lookupCustomers(query: string, requesterRole: string) {
    if (!['superAdmin', 'supportAgent', 'inventoryManager'].includes(requesterRole)) {
      throw new AppError(ErrorCode.INSUFFICIENT_ROLE, 'Insufficient permissions to lookup customers');
    }
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

    // Revoke all Firebase refresh tokens to force re-authentication on next request
    // NOTE: Firebase expects the Firebase UID, not the PostgreSQL user ID
    try {
      const userToRevoke = await this.adminUserRepo.findById(userId);
      if (userToRevoke && userToRevoke.firebaseUid) {
        await admin.auth().revokeRefreshTokens(userToRevoke.firebaseUid);
      }
    } catch (err) {
      logger.error(`Failed to revoke Firebase tokens for user ${userId}:`, err);
      // Continue anyway - user is already soft deleted
    }

    // Mark session as revoked to invalidate active JWTs immediately
    try {
      await this.adminUserRepo.resetSession(userId);
    } catch (err) {
      logger.error(`Failed to revoke session for user ${userId}:`, err);
      // Continue anyway - user is already soft deleted
    }

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
    const safe = async <T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        logger.warn(`[AdminService] Dashboard metric failed (${label})`, error);
        return fallback;
      }
    };

    const [revenue, trends, topProducts, topFabrics, codStats, failedPayments, funnel, health, abandonedRate, dailyComparison, weeklyComparison, shiprocketIssues] = await Promise.all([
      safe(() => this.dashboardRepo.getRevenueMetrics(30), { totalRevenue: 0, avgOrderValue: 0, orderCount: 0, revenueByStatus: {} }, 'revenue'),
      safe(() => this.dashboardRepo.getOrderTrends(30), [], 'trends'),
      safe(() => this.dashboardRepo.getTopProducts(5), [], 'topProducts'),
      safe(() => this.dashboardRepo.getTopFabrics(5), [], 'topFabrics'),
      safe(() => this.dashboardRepo.getCODStats(), { pending_confirmation: 0, fraud_flagged: 0 }, 'codStats'),
      safe(() => this.dashboardRepo.getFailedPaymentsCount(), 0, 'failedPayments'),
      safe(() => this.dashboardRepo.getConversionFunnel(30), { views: 0, addToCarts: 0, checkouts: 0, purchases: 0 }, 'funnel'),
      safe(() => this.dashboardRepo.getSystemHealth(), { errorRate: 0, avgLatency: 0, activeSessions: 0 }, 'health'),
      safe(() => this.dashboardRepo.getAbandonedCartRate(), 0, 'abandonedRate'),
      safe(() => this.dashboardRepo.getPeriodComparison(1), { currentOrders: 0, previousOrders: 0, ordersDeltaPct: 0, currentRevenue: 0, previousRevenue: 0, revenueDeltaPct: 0 }, 'dailyComparison'),
      safe(() => this.dashboardRepo.getPeriodComparison(7), { currentOrders: 0, previousOrders: 0, ordersDeltaPct: 0, currentRevenue: 0, previousRevenue: 0, revenueDeltaPct: 0 }, 'weeklyComparison'),
      safe(() => this.dashboardRepo.getShiprocketIssues(6), 0, 'shiprocketIssues')
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
