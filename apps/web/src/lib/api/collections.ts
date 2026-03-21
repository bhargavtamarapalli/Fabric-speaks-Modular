import { apiFetch } from '@/lib/apiClient';
import { Product } from './products';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  productCount: number;
}

export interface CollectionDetail extends Collection {
  products: Product[];
}

export async function getCollectionBySlug(slug: string, signal?: AbortSignal): Promise<CollectionDetail> {
  return apiFetch<CollectionDetail>(`/collections/${slug}`, { signal });
}

export async function getCollections(signal?: AbortSignal): Promise<Collection[]> {
  const res = await apiFetch<{ items: Collection[] }>('/collections', { signal });
  return res.items || [];
}
