import { apiFetch } from '@/lib/apiClient';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  brandName: string;
  thumbnailUrl: string;
  variantId: string;
  size: string;
  colour: string;
  price: number;
  salePrice?: number;
  quantity: number;
  isSaleActive: boolean;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export async function getCart(signal?: AbortSignal): Promise<Cart> {
  return apiFetch<Cart>('/cart', { signal });
}

export async function addToCart(variantId: string, quantity: number, signal?: AbortSignal): Promise<Cart> {
  return apiFetch<Cart>('/cart/items', {
    method: 'POST',
    data: { variantId, quantity },
    signal
  });
}

export async function updateCartItemQuantity(itemId: string, quantity: number, signal?: AbortSignal): Promise<Cart> {
  return apiFetch<Cart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    data: { quantity },
    signal
  });
}

export async function removeFromCart(itemId: string, signal?: AbortSignal): Promise<Cart> {
  return apiFetch<Cart>(`/cart/items/${itemId}`, {
    method: 'DELETE',
    signal
  });
}

export async function applyCoupon(code: string, signal?: AbortSignal): Promise<Cart> {
  return apiFetch<Cart>('/cart/coupon', {
    method: 'POST',
    data: { code },
    signal
  });
}

export async function removeCoupon(signal?: AbortSignal): Promise<Cart> {
  return apiFetch<Cart>('/cart/coupon', {
    method: 'DELETE',
    signal
  });
}
