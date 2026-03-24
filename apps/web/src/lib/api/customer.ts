import { apiFetch } from '@/lib/apiClient';

export interface UserProfile {
  name: string;
  email: string;
  mobile: string;
  whatsapp_enabled: boolean;
  email_verified: boolean;
}

export async function getProfile(signal?: AbortSignal): Promise<UserProfile> {
  return apiFetch<UserProfile>('/customer/profile', { signal });
}

export async function updateProfile(data: Partial<UserProfile>, signal?: AbortSignal): Promise<UserProfile> {
  return apiFetch<UserProfile>('/customer/profile', {
    method: 'PATCH',
    data,
    signal
  });
}
