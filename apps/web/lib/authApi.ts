import { CustomerProfile, getWithCache, post, patch, invalidateAdminCache } from './admin/api';

/**
 * ─── Auth & Profile Types ───────────────────────────────────────────────────
 */

export interface ChangePasswordDto {
  currentPassword:  string;
  newPassword:      string;
}

export interface SessionInfo {
  id:        string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ProfileAuditLog {
  id:         string;
  action:     string;
  entityType: string;
  createdAt:  string;
  ipAddress?: string;
}

/**
 * ─── Auth API Client ────────────────────────────────────────────────────────
 * 
 * Handles customer profile, password changes, and session management.
 * These endpoints are used by both admin users (for their own profile) 
 * and customers.
 */
export const authApi = {
  /**
   * Fetches the current user's profile.
   */
  getProfile: (signal?: AbortSignal) => 
    getWithCache<CustomerProfile>('/auth/customer/profile', signal),
  
  /**
   * Updates the current user's profile.
   */
  updateProfile: async (data: Partial<CustomerProfile>) => {
    const res = await patch<CustomerProfile>('/auth/customer/profile', data);
    invalidateAdminCache('/auth/customer/profile');
    return res;
  },

  /**
   * Fetches active sessions for the current user.
   */
  getSessions: (signal?: AbortSignal) => 
    getWithCache<{ sessions: SessionInfo[] }>('/auth/sessions', signal),

  /**
   * Revokes a specific session by token.
   */
  revokeSession: async (token: string) => {
    const res = await post<void>('/auth/sessions/revoke', { token });
    invalidateAdminCache('/auth/sessions');
    return res;
  },

  /**
   * Revokes all other sessions except the current one.
   */
  revokeOthers: async () => {
    const res = await post<void>('/auth/sessions/revoke-others');
    invalidateAdminCache('/auth/sessions');
    return res;
  },

  /**
   * Changes the current user's password.
   */
  changePassword: (data: ChangePasswordDto) => 
    patch<void>('/auth/customer/change-password', data),

  /**
   * Fetches security audit logs for the current user.
   */
  getAuditLogs: (signal?: AbortSignal) => 
    getWithCache<ProfileAuditLog[]>('/auth/audit-logs', signal),
};
