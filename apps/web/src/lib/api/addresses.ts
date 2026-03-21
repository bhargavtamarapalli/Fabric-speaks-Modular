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

export async function getAddresses(): Promise<Address[]> {
  const res = await apiFetch<{ items: Address[] }>('/addresses');
  return res.items || [];
}

export async function createAddress(data: Omit<Address, 'id' | 'isDefault'>): Promise<Address> {
  return apiFetch<Address>('/addresses', { method: 'POST', data });
}

export async function updateAddress(id: string, data: Partial<Omit<Address, 'id'>>): Promise<Address> {
  return apiFetch<Address>(`/addresses/${id}`, { method: 'PATCH', data });
}

export async function deleteAddress(id: string): Promise<void> {
  await apiFetch(`/addresses/${id}`, { method: 'DELETE' });
}

export async function setDefaultAddress(id: string): Promise<Address> {
  return apiFetch<Address>(`/addresses/${id}/default`, { method: 'POST' });
}
