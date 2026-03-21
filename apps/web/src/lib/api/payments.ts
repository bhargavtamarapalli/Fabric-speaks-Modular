import { apiFetch } from '@/lib/apiClient';

export interface RazorpayOrderPayload {
  razorpayOrderId: string;
  key: string;
  amount: number; // paise
  currency: string;
  name: string;
  description: string;
}

export interface PaymentVerifyPayload {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export async function initiateRazorpay(orderId: string): Promise<RazorpayOrderPayload> {
  return apiFetch<RazorpayOrderPayload>('/payments/razorpay-order', {
    method: 'POST',
    data: { orderId },
  });
}

export async function verifyPayment(payload: PaymentVerifyPayload): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/payments/verify', { 
    method: 'POST', 
    data: {
      razorpayPaymentId: payload.razorpayPaymentId,
      razorpayOrderId: payload.razorpayOrderId,
      razorpaySignature: payload.razorpaySignature
    } 
  });
}

export async function confirmCod(orderId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/payments/cod/confirm', { 
    method: 'POST', 
    data: { orderId } 
  });
}
