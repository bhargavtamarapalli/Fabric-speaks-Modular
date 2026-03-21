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

export async function getCart(): Promise<Cart> {
  return apiFetch<Cart>('/cart');
}

export async function addToCart(variantId: string, quantity: number): Promise<Cart> {
  return apiFetch<Cart>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ variantId, quantity })
  });
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<Cart> {
  return apiFetch<Cart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity })
  });
}

export async function removeFromCart(itemId: string): Promise<Cart> {
  return apiFetch<Cart>(`/cart/items/${itemId}`, {
    method: 'DELETE'
  });
}

export async function applyCoupon(code: string): Promise<Cart> {
  return apiFetch<Cart>('/cart/coupon', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}

export async function removeCoupon(): Promise<Cart> {
  return apiFetch<Cart>('/cart/coupon', {
    method: 'DELETE'
  });
}
