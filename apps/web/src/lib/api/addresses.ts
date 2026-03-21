import { apiFetch } from '@/lib/apiClient';

export interface Address {
  id: string;
  label: string;
  fullName: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export async function getAddresses(signal?: AbortSignal): Promise<Address[]> {
  const res = await apiFetch<{ items: Address[] }>('/addresses', { signal });
  return res.items || [];
}

export async function createAddress(data: Omit<Address, 'id' | 'isDefault'>, signal?: AbortSignal): Promise<Address> {
  return apiFetch<Address>('/addresses', { method: 'POST', data, signal });
}

export async function updateAddress(id: string, data: Partial<Omit<Address, 'id'>>, signal?: AbortSignal): Promise<Address> {
  return apiFetch<Address>(`/addresses/${id}`, { method: 'PATCH', data, signal });
}

export async function deleteAddress(id: string, signal?: AbortSignal): Promise<void> {
  await apiFetch(`/addresses/${id}`, { method: 'DELETE', signal });
}

export async function setDefaultAddress(id: string, signal?: AbortSignal): Promise<Address> {
  return apiFetch<Address>(`/addresses/${id}/default`, { method: 'POST', signal });
}
