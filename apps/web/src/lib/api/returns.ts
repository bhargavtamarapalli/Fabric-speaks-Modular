import { apiFetch } from '@/lib/apiClient';

export interface ReturnRequest {
  id: string;
  order_id: string;
  status: string;
  reason: string;
  pickup_date?: string;
  created_at: string;
}

export async function initiateReturn(orderId: string, reason: string): Promise<ReturnRequest> {
  return apiFetch<ReturnRequest>(`/orders/${orderId}/return`, { method: 'POST', data: { reason } });
}

export async function getReturn(returnId: string): Promise<ReturnRequest> {
  return apiFetch<ReturnRequest>(`/returns/${returnId}`);
}

export async function optInWhatsApp(orderId: string, consent: boolean): Promise<void> {
  await apiFetch('/notifications/consent', { method: 'POST', data: { orderId, consent, channel: 'WHATSAPP' } });
}
