import { apiFetch } from '@/lib/apiClient';

export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  product_name: string;
  variant_label: string;
  qty: number;
  price: number;
  image_url: string;
  is_returnable: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  estimated_delivery?: string;
  items: OrderItem[];
  address: {
    full_name: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  payment_method: string;
}

export interface PlaceOrderPayload {
  address_id?: string;
  guest_address?: {
    full_name: string;
    mobile: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  payment_method: 'RAZORPAY' | 'COD';
  coupon_code?: string;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  return apiFetch<Order>('/orders', { method: 'POST', data: payload });
}

export async function getOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`);
}

export async function getOrders(params?: { status?: string; page?: number; limit?: number }): Promise<{ items: Order[]; meta: { total: number; page: number; limit: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('filter[status]', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  return apiFetch(`/orders?${searchParams.toString()}`);
}

export async function trackGuestOrder(mobile: string, orderId: string, otp: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/guest-track`, { method: 'POST', data: { mobile, otp } });
}

export async function cancelOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/cancel`, { method: 'POST' });
}

export async function getLatestOrder(): Promise<Order> {
  const result = await getOrders({ limit: 1 });
  return result.items[0];
}
