import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from './admin.service';
import { adminUserRepository } from '../repositories/admin-user.repository';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { AppError } from '@fs/shared/errors';

vi.mock('../repositories/admin-user.repository');
vi.mock('../repositories/audit-log.repository');

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAdminUser (ADM-02)', () => {
    it('should successfully create an admin user and append to audit_log (RULE 6)', async () => {
      const mockAdminId = 'admin-123';
      const mockCreatedUser = { id: 'new-user', name: 'Test', mobile: '9999999999', role: 'supportAgent', isDeleted: false, createdAt: new Date() };
      
      vi.mocked(adminUserRepository.create).mockResolvedValue(mockCreatedUser);
      vi.mocked(auditLogRepository.insert).mockResolvedValue(undefined);

      const result = await adminService.createAdminUser({ name: 'Test', mobile: '9999999999', role: 'supportAgent' }, mockAdminId);

      expect(result).toEqual(mockCreatedUser);
      expect(adminUserRepository.create).toHaveBeenCalledWith({ name: 'Test', mobile: '9999999999', role: 'supportAgent' });
      expect(auditLogRepository.insert).toHaveBeenCalledWith({
        adminId: mockAdminId,
        action: 'admin_user_create',
        targetType: 'user',
        targetId: 'new-user',
        payload: { name: 'Test', role: 'supportAgent' }
      }); // Verification of Rule 6
    });

    it('should throw an AppError on duplicate mobile (Corner Case)', async () => {
      const mockAdminId = 'admin-123';
      const error = new Error('Duplicate');
      (error as any).code = '23505';

      vi.mocked(adminUserRepository.create).mockRejectedValue(error);

      await expect(adminService.createAdminUser({ name: 'Test', mobile: '9999999999', role: 'supportAgent' }, mockAdminId))
        .rejects.toThrowError('Mobile already registered');
      
      // Should not log audit if creation fails
      expect(auditLogRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('updateAdminRole (ADM-03)', () => {
    it('should prevent an admin from changing their own role (Edge Case)', async () => {
      await expect(adminService.updateAdminRole('admin-123', 'customer', 'admin-123'))
        .rejects.toThrowError('Cannot change your own role');
    });

    it('should update role and write to audit log', async () => {
      vi.mocked(adminUserRepository.findById).mockResolvedValue({ id: 'user-456', name: 'User', mobile: '9999999999', role: 'supportAgent', isDeleted: false, createdAt: new Date() });
      vi.mocked(adminUserRepository.updateRole).mockResolvedValue({ id: 'user-456', name: 'User', mobile: '9999999999', role: 'inventoryManager', isDeleted: false, createdAt: new Date() });
      
      const result = await adminService.updateAdminRole('user-456', 'inventoryManager', 'admin-123');
      
      expect(result?.role).toBe('inventoryManager');
      expect(auditLogRepository.insert).toHaveBeenCalledWith(expect.objectContaining({
        adminId: 'admin-123',
        action: 'admin_role_change',
        payload: { previousRole: 'supportAgent', newRole: 'inventoryManager' }
      }));
    });
  });

  describe('deleteAdminUser (ADM-04)', () => {
    it('should prevent deleting own account', async () => {
      await expect(adminService.deleteAdminUser('admin-123', 'admin-123'))
        .rejects.toThrowError('Cannot delete your own account');
    });

    it('should soft delete and record audit log', async () => {
      vi.mocked(adminUserRepository.softDelete).mockResolvedValue(true);
      
      await adminService.deleteAdminUser('user-456', 'admin-123');
      
      expect(auditLogRepository.insert).toHaveBeenCalledWith(expect.objectContaining({
        adminId: 'admin-123',
        action: 'admin_user_delete',
        targetId: 'user-456',
      }));
    });
  });
});
