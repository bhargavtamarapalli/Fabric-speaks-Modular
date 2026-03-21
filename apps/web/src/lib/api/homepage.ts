import { apiFetch } from '@/lib/apiClient';
import { Product } from './products';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

export interface HomepageData {
  hero: {
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaLink: string;
    ctaText: string;
  };
  featuredCollections: Collection[];
  featuredProducts: Product[];
  announcement?: string;
}

export async function getHomepageData(signal?: AbortSignal): Promise<HomepageData> {
  return apiFetch<HomepageData>('/homepage', { signal });
}
