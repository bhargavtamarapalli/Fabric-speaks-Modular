import { ApiError } from '@/lib/apiClient';

export function isAuthFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 401 || error.statusCode === 403;
  }
  const status = (error as { response?: { status?: number }; status?: number } | null)?.response?.status
    ?? (error as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

export function normalizeListPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const maybeData = (payload as { data?: unknown }).data;
    if (Array.isArray(maybeData)) return maybeData as T[];
    const maybeItems = (payload as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) return maybeItems as T[];
  }
  return [];
}

export async function fetchListWithAuthFallback<T>(options: {
  loadAdmin: () => Promise<unknown>;
  loadPublic: () => Promise<unknown>;
  mapItem: (item: unknown) => T;
  debugKey?: string;
}): Promise<T[]> {
  const { loadAdmin, loadPublic, mapItem, debugKey } = options;
  try {
    const adminPayload = await loadAdmin();
    const items = normalizeListPayload(adminPayload).map(mapItem);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ADMIN_LIST_FETCH][${debugKey ?? 'unknown'}] admin source`, { count: items.length });
    }
    return items;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ADMIN_LIST_FETCH][${debugKey ?? 'unknown'}] admin source failed`, error);
    }
    if (!isAuthFailure(error)) throw error;
    const publicPayload = await loadPublic();
    const items = normalizeListPayload(publicPayload).map(mapItem);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ADMIN_LIST_FETCH][${debugKey ?? 'unknown'}] public fallback source`, { count: items.length });
    }
    return items;
  }
}
