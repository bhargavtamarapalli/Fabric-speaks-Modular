import { apiFetch } from '@/lib/apiClient';

export interface ReturnRequest {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  pickupDate?: string;
  createdAt: string;
}

export async function initiateReturn(orderId: string, reason: string, signal?: AbortSignal): Promise<ReturnRequest> {
  return apiFetch<ReturnRequest>(`/orders/${orderId}/returns`, { method: 'POST', data: { reason }, signal });
}

export async function getOrderReturns(orderId: string, signal?: AbortSignal): Promise<ReturnRequest[]> {
  return apiFetch<ReturnRequest[]>(`/orders/${orderId}/returns`, { signal });
}

export async function optInWhatsApp(orderId: string, consent: boolean, signal?: AbortSignal): Promise<void> {
  await apiFetch('/notifications/whatsapp/consent', { method: 'POST', data: { orderId, consent }, signal });
}
