import { apiFetch } from '@/lib/apiClient';

export interface Story {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  heroImageUrl: string;
  category: string;
  publishedAt: string;
}

export async function getStoryBySlug(slug: string): Promise<Story> {
  return apiFetch<Story>(`/stories/${slug}`);
}

export async function getStories(): Promise<{ items: Story[]; total: number }> {
  return apiFetch<{ items: Story[]; total: number }>('/stories');
}
