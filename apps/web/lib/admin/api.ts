// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Admin API Client
// All admin API calls go through this file.
// Never use raw fetch in page components.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from '@/lib/apiClient';
import type {
  Order, OrderTimeline, PackingSlip,
  Product, Brand, Category, Collection,
  InventoryItem, StockHealth, InventoryAdjustment, ExpectedStock,
  Return, ReturnTimeline, RefundStatus,
  SupportCase, CustomerProfile,
  Coupon, StoreSettings, AdminUser,
  AuditLogEntry, DashboardData, ContentPage, AnalyticsData,
} from './types';

// ─── Cache & Deduplication ──────────────────────────────────────────────────

const CACHE_KEY = 'fs_admin_api_cache';

/**
 * Cache storage using sessionStorage instead of localStorage.
 * 
 * SECURITY: sessionStorage is cleared when the browser tab is closed,
 * significantly reducing the exposure window for XSS attacks.
 * This is appropriate for admin data that should not persist indefinitely.
 */
// Synchronous initial load from sessionStorage if in browser
const initialCache = (() => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    return stored ? Object.entries(JSON.parse(stored)) : [];
  } catch {
    return [];
  }
})();

// Cache stores API responses with timestamps for TTL-based invalidation.
// Using 'any' for data field since API responses have varied shapes that are
// validated by the calling code. The cache provides deduplication and TTL,
// not type safety - type safety comes from the API layer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { data: any; timestamp: number }>(initialCache as any);
// Pending requests map for request deduplication during rapid navigation.
// Uses 'any' for the Promise type since we deduplicate by URL, not by response shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Persists the current cache to sessionStorage.
 * 
 * Note: sessionStorage is tab-specific - each browser tab has its own
 * isolated storage. This is ideal for admin dashboards where users might
 * have multiple tabs open with different data requirements.
 */
function syncToStorage() {
  if (typeof window === 'undefined') return;
  try {
    const obj = Object.fromEntries(cache);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn('[Admin API] Failed to persist cache', err);
  }
}

/**
 * Normalises a URL by removing trailing slashes and sorting query params
 * to ensure cache keys are consistent.
 */
function normalizeUrl(url: string): string {
  try {
    const [path, query] = url.split('?');
    if (!query) return path.replace(/\/$/, '');
    const params = new URLSearchParams(query);
    params.sort();
    return `${path.replace(/\/$/, '')}?${params.toString()}`;
  } catch {
    return url;
  }
}

/**
 * Builds a query string from params, filtering out undefined/null values.
 * This prevents URLSearchParams from serializing undefined as the literal string "undefined".
 */
function buildQueryString(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const filtered = Object.entries(params).filter(([_, value]) => value !== undefined && value !== null);
  if (filtered.length === 0) return '';
  return new URLSearchParams(filtered.map(([k, v]) => [k, String(v)])).toString();
}

/**
 * Invalidates cache entries matching a prefix (e.g., '/admin/orders')
 */
export function invalidateAdminCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    syncToStorage();
    return;
  }
  const normalizedPrefix = normalizeUrl(prefix);
  let changed = false;
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(normalizedPrefix)) {
      cache.delete(key);
      changed = true;
    }
  }
  if (changed) syncToStorage();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// GET wrapper for admin API calls.
// Uses 'any' for response type as the generic apiClient.get already handles type transformation.
// The return type <T> ensures type safety for callers while allowing the internal response
// to be passed through without additional type casting.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _get = <T>(url: string, signal?: AbortSignal) => apiClient.get<any, T>(url, { signal });

/**
 * GET wrapper with TTL caching and request deduplication.
 */
async function getWithCache<T>(url: string, signal?: AbortSignal, ttl = CACHE_TTL): Promise<T> {
  const key = normalizeUrl(url);

  // 1. Deduplicate concurrent identical requests
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // 2. Return valid cached data
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  // 3. Fetch and populate cache
  const requestPromise = _get<T>(url, signal).then(response => {
    cache.set(key, { data: response, timestamp: Date.now() });
    syncToStorage();
    pendingRequests.delete(key);
    return response;
  }).catch(err => {
    pendingRequests.delete(key);
    throw err;
  });

  pendingRequests.set(key, requestPromise);
  return requestPromise;
}

// POST/PATCH/DELETE wrappers for admin API calls.
// Using 'any' for request body type since different endpoints accept different shapes.
// The generic <T> return type provides type safety for callers while allowing flexibility
// in the request payload. This is a common pattern for API wrapper functions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = <T>(url: string, data?: any) => apiClient.post<any, T>(url, data);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patch = <T>(url: string, data?: any) => apiClient.patch<any, T>(url, data);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const del = <T>(url: string) => apiClient.delete<any, T>(url);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getData: (signal?: AbortSignal) => getWithCache<DashboardData>('/admin/dashboard', signal),
  getPendingActions: (signal?: AbortSignal) => getWithCache<DashboardData>('/admin/dashboard/pending-actions', signal),
  getAnalytics: (range: '7d' | '30d' | '90d', signal?: AbortSignal) =>
    getWithCache<AnalyticsData>(`/admin/analytics?range=${range}`, signal),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }, signal?: AbortSignal) => {
    const qs = buildQueryString(params);
    return getWithCache<{ items: Order[]; total: number; page: number; limit: number; totalPages: number }>(`/admin/orders?${qs}`, signal);
  },

  getById: (id: string, signal?: AbortSignal) => getWithCache<Order>(`/admin/orders/${id}`, signal),
  getTimeline: (id: string, signal?: AbortSignal) => getWithCache<OrderTimeline[]>(`/admin/orders/${id}/timeline`, signal),
  getPackingSlip: (id: string, signal?: AbortSignal) => getWithCache<PackingSlip>(`/admin/orders/${id}/packing-slip`, signal),

  updateStatus: async (id: string, status: string) => {
    const res = await patch<Order>(`/admin/orders/${id}/status`, { status });
    invalidateAdminCache('/admin/orders');
    invalidateAdminCache(`/admin/orders/${id}`);
    return res;
  },

  cancel: async (id: string, reason: string) => {
    const res = await patch<Order>(`/admin/orders/${id}/cancel`, { reason });
    invalidateAdminCache('/admin/orders');
    invalidateAdminCache(`/admin/orders/${id}`);
    return res;
  },

  pushToShiprocket: async (id: string) => {
    const res = await post<Order>(`/admin/orders/${id}/shiprocket`, {});
    invalidateAdminCache('/admin/orders');
    invalidateAdminCache(`/admin/orders/${id}`);
    return res;
  },

  bulkPushShiprocket: async (ids: string[]) => {
    const res = await post<{ pushed: number }>('/admin/orders/shiprocket/bulk', { ids });
    invalidateAdminCache('/admin/orders');
    ids.forEach(id => invalidateAdminCache(`/admin/orders/${id}`));
    return res;
  },

  bulkUpdateStatus: async (ids: string[], status: string) => {
    const res = await patch<{ updated: number }>('/admin/orders/status/bulk', { ids, status });
    invalidateAdminCache('/admin/orders');
    ids.forEach(id => invalidateAdminCache(`/admin/orders/${id}`));
    return res;
  },

  exportCsv: (params?: { dateFrom?: string; dateTo?: string }) => {
    const qs = buildQueryString(params);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
    }
    return `${baseUrl}/admin/orders/export?${qs}`;
  },
};

// ─── Products ────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: {
    fabric?: string;
    brand?: string;
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }, signal?: AbortSignal) => {
    const qs = buildQueryString(params);
    return getWithCache<{ items: Product[]; total: number; page: number; limit: number; totalPages: number }>(`/admin/products?${qs}`, signal);
  },

  getById: (id: string, signal?: AbortSignal) => getWithCache<Product>(`/admin/products/${id}`, signal),

  create: async (data: Omit<Product, 'id' | 'slug' | 'createdAt'>) => {
    const res = await post<Product>('/admin/products', data);
    invalidateAdminCache('/admin/products');
    return res;
  },

  update: async (id: string, data: Partial<Product>) => {
    const res = await patch<Product>(`/admin/products/${id}`, data);
    invalidateAdminCache('/admin/products');
    invalidateAdminCache(`/admin/products/${id}`);
    return res;
  },

  deactivate: async (id: string, confirm: boolean = false) => {
    const res = await post<{ items: Product[]; total: number }>(`/admin/products/${id}/deactivate`, { confirm });
    invalidateAdminCache('/admin/products');
    invalidateAdminCache(`/admin/products/${id}`);
    return res;
  },

  bulkUpdateVariants: async (id: string, variants: {
    variantId: string;
    stockQty?: number;
    price?: number;
    comparePrice?: number;
    colourImageUrl?: string;
  }[]) => {
    const res = await patch<{ updated: number }>(`/admin/products/${id}/variants/bulk`, { variants });
    invalidateAdminCache(`/admin/products/${id}`);
    invalidateAdminCache('/admin/products');
    return res;
  },

  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const result = await apiClient.post<{ url: string }>('/admin/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return result.data.url;
  },
};

// ─── Brands ───────────────────────────────────────────────────────────────────

export const brandsApi = {
  list: (signal?: AbortSignal) => getWithCache<Brand[]>('/admin/brands', signal),
  create: async (data: Omit<Brand, 'id'>) => {
    const res = await post<Brand>('/admin/brands', data);
    invalidateAdminCache('/admin/brands');
    return res;
  },
  update: async (id: string, data: Partial<Brand>) => {
    const res = await patch<Brand>(`/admin/brands/${id}`, data);
    invalidateAdminCache('/admin/brands');
    return res;
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: (signal?: AbortSignal) => getWithCache<Category[]>('/admin/categories', signal),
  create: async (data: Omit<Category, 'id'>) => {
    const res = await post<Category>('/admin/categories', data);
    invalidateAdminCache('/admin/categories');
    return res;
  },
  update: async (id: string, data: Partial<Category>) => {
    const res = await patch<Category>(`/admin/categories/${id}`, data);
    invalidateAdminCache('/admin/categories');
    return res;
  },
};

// ─── Collections ─────────────────────────────────────────────────────────────

export const collectionsApi = {
  list: (signal?: AbortSignal) => getWithCache<Collection[]>('/admin/collections', signal),
  getById: (id: string, signal?: AbortSignal) => getWithCache<Collection & { products: Product[] }>(`/admin/collections/${id}`, signal),
  create: async (data: Omit<Collection, 'id' | 'productCount'>) => {
    const res = await post<Collection>('/admin/collections', data);
    invalidateAdminCache('/admin/collections');
    return res;
  },
  update: async (id: string, data: Partial<Collection>) => {
    const res = await patch<Collection>(`/admin/collections/${id}`, data);
    invalidateAdminCache('/admin/collections');
    invalidateAdminCache(`/admin/collections/${id}`);
    return res;
  },
  addProduct: async (id: string, productId: string) => {
    const res = await post<void>(`/admin/collections/${id}/products`, { productId });
    invalidateAdminCache(`/admin/collections/${id}`);
    return res;
  },
  removeProduct: async (id: string, productId: string) => {
    const res = await del<void>(`/admin/collections/${id}/products/${productId}`);
    invalidateAdminCache(`/admin/collections/${id}`);
    return res;
  },
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  list: (params?: { status?: string; search?: string }, signal?: AbortSignal) => {
    const qs = buildQueryString(params);
    return getWithCache<InventoryItem[]>(`/admin/inventory?${qs}`, signal);
  },

  getHealth: (signal?: AbortSignal) => getWithCache<StockHealth>('/admin/inventory/stock-health', signal),

  adjust: async (variantId: string, data: {
    adjustmentQty: number;
    reason: string;
  }) => {
    const res = await post<InventoryItem>('/admin/inventory/adjust', { variantId, ...data });
    invalidateAdminCache('/admin/inventory');
    invalidateAdminCache('/admin/products'); // Stock adjustments affect products
    return res;
  },

  getAdjustments: (variantId: string, signal?: AbortSignal) =>
    getWithCache<InventoryAdjustment[]>(`/admin/inventory/${variantId}/adjustments`, signal),

  getExpected: (signal?: AbortSignal) => getWithCache<ExpectedStock[]>('/admin/inventory/expected-stock', signal),
  addExpected: async (data: Omit<ExpectedStock, 'id'>) => {
    const res = await post<ExpectedStock>('/admin/inventory/expected-stock', data);
    invalidateAdminCache('/admin/inventory/expected-stock');
    return res;
  },
  updateExpectedStatus: async (id: string, status: string) => {
    const res = await patch<ExpectedStock>(`/admin/inventory/expected-stock/${id}/status`, { status });
    invalidateAdminCache('/admin/inventory/expected-stock');
    return res;
  },
};

// ─── Returns ─────────────────────────────────────────────────────────────────

export const returnsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }, signal?: AbortSignal) => {
    const qs = buildQueryString(params);
    return getWithCache<{ items: Return[]; total: number; page: number; limit: number; totalPages: number }>(`/admin/returns?${qs}`, signal);
  },

  getById: (id: string, signal?: AbortSignal) => getWithCache<Return>(`/admin/returns/${id}`, signal),
  getTimeline: (id: string, signal?: AbortSignal) => getWithCache<ReturnTimeline[]>(`/admin/returns/${id}/timeline`, signal),
  getRefundStatus: (id: string, signal?: AbortSignal) => getWithCache<RefundStatus>(`/admin/returns/${id}/refund-status`, signal),

  updateStatus: async (id: string, status: string) => {
    const res = await patch<Return>(`/admin/returns/${id}/status`, { status });
    invalidateAdminCache('/admin/returns');
    invalidateAdminCache(`/admin/returns/${id}`);
    return res;
  },

  schedulePickup: async (id: string) => {
    const res = await post<Return>(`/admin/returns/${id}/shiprocket`, {});
    invalidateAdminCache(`/admin/returns/${id}`);
    return res;
  },

  resolve: async (id: string, resolution: 'REFUND' | 'REPLACEMENT') => {
    const res = await post<Return>(`/admin/returns/${id}/resolve`, { resolution });
    invalidateAdminCache('/admin/returns');
    invalidateAdminCache(`/admin/returns/${id}`);
    return res;
  },
};

// ─── Support ─────────────────────────────────────────────────────────────────

export const supportApi = {
  list: (params?: { status?: string; page?: number; limit?: number }, signal?: AbortSignal) => {
    const qs = buildQueryString(params);
    return getWithCache<{ items: SupportCase[]; total: number; page: number; limit: number; totalPages: number }>(`/admin/support/queries?${qs}`, signal);
  },

  getById: (id: string, signal?: AbortSignal) => getWithCache<SupportCase>(`/admin/support/queries/${id}`, signal),
  updateStatus: async (id: string, status: string) => {
    const res = await patch<SupportCase>(`/admin/support/queries/${id}`, { status });
    invalidateAdminCache('/admin/support/queries');
    invalidateAdminCache(`/admin/support/queries/${id}`);
    return res;
  },

  addNote: async (id: string, note: string) => {
    const res = await post<SupportCase>(`/admin/support/queries/${id}/note`, { note });
    invalidateAdminCache(`/admin/support/queries/${id}`);
    return res;
  },

  lookupCustomer: (mobile: string, signal?: AbortSignal) =>
    getWithCache<CustomerProfile>(`/admin/users/customers?mobile=${encodeURIComponent(mobile)}`, signal),

  addCustomerNote: async (mobile: string, note: string) => {
    const res = await post<void>(`/admin/users/customers/${encodeURIComponent(mobile)}/note`, { note });
    invalidateAdminCache('/admin/users/customers');
    return res;
  },

  addCustomerTag: async (mobile: string, tag: string) => {
    const res = await post<void>(`/admin/users/customers/${encodeURIComponent(mobile)}/tag`, { tag });
    invalidateAdminCache('/admin/users/customers');
    return res;
  },
};

// ─── Coupons ─────────────────────────────────────────────────────────────────

export const couponsApi = {
  list: (params?: { page?: number; limit?: number }, signal?: AbortSignal) => {
    const qs = buildQueryString(params);
    return getWithCache<{ items: Coupon[]; total: number; page: number; limit: number; totalPages: number }>(`/admin/coupons?${qs}`, signal);
  },
  create: async (data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>) => {
    const res = await post<Coupon>('/admin/coupons', data);
    invalidateAdminCache('/admin/coupons');
    return res;
  },
  update: async (id: string, data: Partial<Coupon>) => {
    const res = await patch<Coupon>(`/admin/coupons/${id}`, data);
    invalidateAdminCache('/admin/coupons');
    return res;
  },
  deactivate: async (id: string) => {
    const res = await patch<Coupon>(`/admin/coupons/${id}`, { isActive: false });
    invalidateAdminCache('/admin/coupons');
    return res;
  },
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsApi = {
  getAll: (signal?: AbortSignal) => getWithCache<StoreSettings>('/admin/settings', signal),
  update: async (key: string, value: string | boolean | number) => {
    const res = await patch<StoreSettings>('/admin/settings', { key: String(key), value: String(value) });
    invalidateAdminCache('/admin/settings');
    return res;
  },
  getPublic: (signal?: AbortSignal) => getWithCache<Partial<StoreSettings>>('/admin/settings/public', signal),
};

// ─── Admin Users ──────────────────────────────────────────────────────────────

export const adminUsersApi = {
  list: (signal?: AbortSignal) => getWithCache<AdminUser[]>('/admin/users', signal),
  create: async (data: Omit<AdminUser, 'id' | 'lastActiveAt' | 'createdAt'>) => {
    const res = await post<AdminUser>('/admin/users', data);
    invalidateAdminCache('/admin/users');
    return res;
  },
  updateRole: async (id: string, role: string) => {
    const res = await patch<AdminUser>(`/admin/users/${id}/role`, { role });
    invalidateAdminCache('/admin/users');
    return res;
  },
  deactivate: async (id: string) => {
    const res = await patch<AdminUser>(`/admin/users/${id}`, { isActive: false });
    invalidateAdminCache('/admin/users');
    return res;
  },
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: { entity?: string; page?: number }, signal?: AbortSignal) => {
    const qs = buildQueryString(params);
    return getWithCache<{ items: AuditLogEntry[]; total: number }>(`/admin/audit-log?${qs}`, signal);
  },
};

// ─── Content Pages ────────────────────────────────────────────────────────────

export const contentApi = {
  list: (signal?: AbortSignal) => getWithCache<ContentPage[]>('/admin/pages', signal),
  getById: (id: string, signal?: AbortSignal) => getWithCache<ContentPage>(`/admin/pages/${id}`, signal),
  create: async (data: Omit<ContentPage, 'id' | 'updatedAt'>) => {
    const res = await post<ContentPage>('/admin/pages', data);
    invalidateAdminCache('/admin/pages');
    return res;
  },
  update: async (id: string, data: Partial<ContentPage>) => {
    const res = await patch<ContentPage>(`/admin/pages/${id}`, data);
    invalidateAdminCache('/admin/pages');
    invalidateAdminCache(`/admin/pages/${id}`);
    return res;
  },
  publish: async (id: string) => {
    const res = await patch<ContentPage>(`/admin/pages/${id}`, { publishedAt: new Date().toISOString() });
    invalidateAdminCache('/admin/pages');
    invalidateAdminCache(`/admin/pages/${id}`);
    return res;
  },
  unpublish: async (id: string) => {
    const res = await patch<ContentPage>(`/admin/pages/${id}`, { publishedAt: null });
    invalidateAdminCache('/admin/pages');
    invalidateAdminCache(`/admin/pages/${id}`);
    return res;
  },
};
