import { apiFetch } from '@/lib/apiClient';

export interface ReturnRequest {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  pickupDate?: string;
  createdAt: string;
}

export async function initiateReturn(orderId: string, reason: string): Promise<ReturnRequest> {
  return apiFetch<ReturnRequest>(`/orders/${orderId}/returns`, { method: 'POST', data: { reason } });
}

export async function getOrderReturns(orderId: string): Promise<ReturnRequest[]> {
  return apiFetch<ReturnRequest[]>(`/orders/${orderId}/returns`);
}

export async function optInWhatsApp(orderId: string, consent: boolean): Promise<void> {
  await apiFetch('/notifications/whatsapp/consent', { method: 'POST', data: { orderId, consent } });
}
