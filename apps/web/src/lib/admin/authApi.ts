/**
 * Typed API service layer for authentication endpoints
 * Centralizes API contracts and provides type safety
 */

import { apiFetch } from '@/lib/apiClient';

export type AdminRole = 'superAdmin' | 'inventoryManager' | 'supportAgent' | 'customer';

export interface PromoteUserRequest {
  email: string;
  role: AdminRole;
}

export interface PromoteUserResponse {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export const authApi = {
  /**
   * Promote a user to a specific admin role (development only)
   * @param params - Email and target role
   * @returns Updated user with new role
   * @throws Error if promotion fails or user not found
   */
  promoteUser: async (params: PromoteUserRequest): Promise<PromoteUserResponse> => {
    const data = await apiFetch<PromoteUserResponse>('/auth/dev/promote-user', {
      method: 'POST',
      data: params,
    });
    return data;
  },
};
