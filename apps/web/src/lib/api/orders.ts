import { apiFetch } from '@/lib/apiClient';

export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  price: number;
  imageUrl: string;
  isReturnable: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  paymentMethod: string;
  items: OrderItem[];
  address: {
    fullName: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  createdAt: string;
  estimatedDelivery?: string;
}

export interface PlaceOrderPayload {
  addressId?: string;
  guestAddress?: {
    fullName: string;
    mobile: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: 'RAZORPAY' | 'COD';
  couponCode?: string;
}

export async function placeOrder(payload: PlaceOrderPayload, signal?: AbortSignal): Promise<Order> {
  return apiFetch<Order>('/customer/orders', { method: 'POST', data: payload, signal });
}

export async function getOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  return apiFetch<Order>(`/customer/orders/${orderId}`, { signal });
}

export async function getOrders(params?: { status?: string; page?: number; limit?: number }, signal?: AbortSignal): Promise<{ items: Order[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  
  return apiFetch<{ items: Order[]; total: number }>(`/customer/orders?${searchParams.toString()}`, { signal });
}

export async function trackGuestOrder(mobile: string, orderId: string, otp: string, signal?: AbortSignal): Promise<Order> {
  return apiFetch<Order>(`/customer/orders/${orderId}/guest-track`, { method: 'POST', data: { mobile, otp }, signal });
}

export async function cancelOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  return apiFetch<Order>(`/customer/orders/${orderId}/cancel`, { method: 'POST', signal });
}

export async function getLatestOrder(signal?: AbortSignal): Promise<Order | null> {
  const result = await getOrders({ limit: 1 }, signal);
  return result.items?.[0] || null;
}
