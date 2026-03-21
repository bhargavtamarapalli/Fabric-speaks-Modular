import { apiFetch } from '@/lib/apiClient';

export interface UserProfile {
  name: string;
  email: string;
  mobile: string;
}

export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/customer/profile');
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return apiFetch<UserProfile>('/customer/profile', {
    method: 'PATCH',
    data
  });
}
