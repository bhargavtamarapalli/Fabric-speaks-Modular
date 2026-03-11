import { apiFetch } from '@/lib/apiClient';

export interface Address {
  id: string;
  label: string;
  full_name: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export async function getAddresses(): Promise<Address[]> {
  const res = await apiFetch<{ items: Address[] }>('/addresses');
  return (res as any).items ?? res;
}

export async function createAddress(data: Omit<Address, 'id' | 'is_default'>): Promise<Address> {
  return apiFetch<Address>('/addresses', { method: 'POST', data });
}
