import { apiFetch } from '@/lib/apiClient';

export interface Variant {
  id: string;
  size: string;
  colour: string;
  sku: string;
  price: number;
  salePrice?: number;
  stockQty: number;
  colourImageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brandName: string;
  categoryName: string;
  fabricType: string;
  gsmWeight: number;
  weaveType: string;
  isSaleActive: boolean;
  price: number;
  salePrice?: number;
  thumbnailUrl: string;
  images: string[];
  variants: Variant[];
}

export async function getProducts(params?: {
  fabric?: string;
  brand?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Product[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.fabric) searchParams.set('fabric', params.fabric);
  if (params?.brand) searchParams.set('brand', params.brand);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  return apiFetch<{ items: Product[]; total: number }>(`/products?${searchParams.toString()}`);
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return apiFetch<Product>(`/products/${slug}`);
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  return apiFetch<string[]>(`/search/suggestions?q=${encodeURIComponent(query)}`);
}
