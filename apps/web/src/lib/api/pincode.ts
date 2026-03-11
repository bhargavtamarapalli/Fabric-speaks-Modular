import { apiFetch } from '@/lib/apiClient';

export interface PincodeCheckResult {
  serviceable: boolean;
  cod_available: boolean;
  estimated_delivery_days: number;
  delivery_date_display: string;
}

export async function checkPincode(pincode: string): Promise<PincodeCheckResult> {
  return apiFetch<PincodeCheckResult>(`/pincodes/${pincode}`);
}
