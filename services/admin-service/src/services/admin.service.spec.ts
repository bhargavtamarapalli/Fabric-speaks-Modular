import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from './admin.service';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { AppError } from '@fs/shared';

vi.mock('../repositories/admin-user.repository');
vi.mock('../repositories/customer.repository');
vi.mock('../repositories/audit-log.repository');
vi.mock('../repositories/dashboard.repository');

describe('AdminService', () => {
  let adminService: AdminService;
  let adminUserRepo: AdminUserRepository;
  let customerRepo: CustomerRepository;
  let auditLogRepo: AuditLogRepository;
  let dashboardRepo: DashboardRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    adminUserRepo = new AdminUserRepository({} as any);
    customerRepo = new CustomerRepository({} as any);
    auditLogRepo = new AuditLogRepository({} as any);
    dashboardRepo = new DashboardRepository({} as any);
    adminService = new AdminService(adminUserRepo, customerRepo, auditLogRepo, dashboardRepo);
  });

  describe('createAdminUser (ADM-02)', () => {
    it('should successfully create an admin user and append to audit_log (RULE 6)', async () => {
      const mockAdminId = 'admin-123';
      const mockCreatedUser = { id: 'new-user', name: 'Test', mobile: '9999999999', role: 'supportAgent', isActive: true, createdAt: new Date(), updatedAt: new Date() };
      
      vi.mocked(adminUserRepo.create).mockResolvedValue(mockCreatedUser);
      vi.mocked(auditLogRepo.insert).mockResolvedValue(undefined);

      const result = await adminService.createAdminUser({ name: 'Test', mobile: '9999999999', role: 'supportAgent' }, mockAdminId, 'superAdmin');

      expect(result).toEqual(mockCreatedUser);
      expect(adminUserRepo.create).toHaveBeenCalledWith({ name: 'Test', mobile: '9999999999', role: 'supportAgent' });
      expect(auditLogRepo.insert).toHaveBeenCalledWith({
        adminId: mockAdminId,
        action: 'admin_user_create',
        entityType: 'user',
        entityId: 'new-user',
        afterJson: { name: 'Test', role: 'supportAgent' }
      }); 
    });

    it('should throw FORBIDDEN if requester is not superAdmin', async () => {
      await expect(adminService.createAdminUser({ name: 'Test', mobile: '9999999999', role: 'supportAgent' }, 'admin-123', 'supportAgent'))
        .rejects.toThrowError('Insufficient permissions');
    });

    it('should throw an AppError on duplicate mobile (Corner Case)', async () => {
      const mockAdminId = 'admin-123';
      const error = new Error('Duplicate');
      (error as any).code = '23505';

      vi.mocked(adminUserRepo.create).mockRejectedValue(error);

      await expect(adminService.createAdminUser({ name: 'Test', mobile: '9999999999', role: 'supportAgent' }, mockAdminId, 'superAdmin'))
        .rejects.toThrowError('Mobile already registered');
    });
  });

  describe('updateAdminRole (ADM-03)', () => {
    it('should prevent an admin from changing their own role (Edge Case)', async () => {
      await expect(adminService.updateAdminRole('admin-123', 'customer', 'admin-123', 'superAdmin'))
        .rejects.toThrowError('Cannot change your own role');
    });

    it('should update role and write to audit log', async () => {
      vi.mocked(adminUserRepo.findById).mockResolvedValue({ id: 'user-456', name: 'User', mobile: '9999999999', role: 'supportAgent', isActive: true, createdAt: new Date(), updatedAt: new Date() });
      vi.mocked(adminUserRepo.updateRole).mockResolvedValue({ id: 'user-456', name: 'User', mobile: '9999999999', role: 'inventoryManager', isActive: true, createdAt: new Date(), updatedAt: new Date() });
      
      const result = await adminService.updateAdminRole('user-456', 'inventoryManager', 'admin-123', 'superAdmin');
      
      expect(result?.role).toBe('inventoryManager');
      expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        adminId: 'admin-123',
        action: 'admin_role_change',
        beforeJson: { role: 'supportAgent' },
        afterJson: { role: 'inventoryManager' }
      }));
    });
  });

  describe('deleteAdminUser (ADM-04)', () => {
    it('should prevent deleting own account', async () => {
      await expect(adminService.deleteAdminUser('admin-123', 'admin-123', 'superAdmin'))
        .rejects.toThrowError('Cannot delete your own account');
    });

    it('should soft delete and record audit log', async () => {
      vi.mocked(adminUserRepo.softDelete).mockResolvedValue(true);
      
      await adminService.deleteAdminUser('user-456', 'admin-123', 'superAdmin');
      
      expect(auditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        adminId: 'admin-123',
        action: 'admin_user_delete',
        entityId: 'user-456',
      }));
    });
  });
});
