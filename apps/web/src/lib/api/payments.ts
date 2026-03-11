import { apiFetch } from '@/lib/apiClient';

export interface RazorpayOrderPayload {
  razorpay_order_id: string;
  key: string;
  amount: number; // paise
  currency: string;
  name: string;
  description: string;
}

export interface PaymentVerifyPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export async function initiateRazorpay(orderId: string): Promise<RazorpayOrderPayload> {
  return apiFetch<RazorpayOrderPayload>('/payments/razorpay-order', {
    method: 'POST',
    data: { orderId },
  });
}

export async function verifyPayment(payload: PaymentVerifyPayload): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/payments/verify', { method: 'POST', data: payload });
}

export async function confirmCod(orderId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/payments/cod/confirm', { method: 'POST', data: { orderId } });
}
