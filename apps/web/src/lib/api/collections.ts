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

export async function getCollectionBySlug(slug: string): Promise<CollectionDetail> {
  return apiFetch<CollectionDetail>(`/collections/${slug}`);
}

export async function getCollections(): Promise<Collection[]> {
  const res = await apiFetch<{ items: Collection[] }>('/collections');
  return res.items || [];
}
