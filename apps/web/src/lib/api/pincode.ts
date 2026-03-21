import { apiFetch } from '@/lib/apiClient';

export interface PincodeCheckResult {
  isServiceable: boolean;
  codAvailable: boolean;
  estimatedDays: number;
  deliveryDate: string;
}

export async function checkPincode(pincode: string): Promise<PincodeCheckResult> {
  return apiFetch<PincodeCheckResult>(`/delivery/check?pincode=${pincode}`);
}
