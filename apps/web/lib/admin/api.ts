// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Admin API Client
// All admin API calls go through this file.
// Never use raw fetch in page components.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Order, OrderTimeline, PackingSlip,
  Product, Brand, Category, Collection,
  InventoryItem, StockHealth, InventoryAdjustment, ExpectedStock,
  Return, ReturnTimeline, RefundStatus,
  SupportCase, CustomerProfile,
  Coupon, StoreSettings, AdminUser,
  AuditLogEntry, DashboardData, ContentPage, AnalyticsData,
} from './types';
import { apiClient } from '@/lib/apiClient';

// ─── Cache & Deduplication ──────────────────────────────────────────────────

const cache = new Map<string, { data: any; timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 30_000; // 30 seconds

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
 * Invalidates cache entries matching a prefix (e.g., '/admin/orders')
 */
export function invalidateAdminCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  const normalizedPrefix = normalizeUrl(prefix);
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(normalizedPrefix)) {
      cache.delete(key);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    pendingRequests.delete(key);
    return response;
  }).catch(err => {
    pendingRequests.delete(key);
    throw err;
  });

  pendingRequests.set(key, requestPromise);
  return requestPromise;
}

const post = <T>(url: string, data?: any) => apiClient.post<any, T>(url, data);
const patch = <T>(url: string, data?: any) => apiClient.patch<any, T>(url, data);
const del = <T>(url: string) => apiClient.delete<any, T>(url);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getData:        ()        => getWithCache<DashboardData>('/admin/dashboard'),
  getPendingActions: ()     => getWithCache<DashboardData>('/admin/dashboard/pending-actions'),
  getAnalytics:   (range: '7d'|'30d'|'90d') =>
    getWithCache<AnalyticsData>(`/admin/analytics?range=${range}`),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }, signal?: AbortSignal) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return getWithCache<{ items: Order[]; total: number }>(`/admin/orders?${qs}`, signal);
  },

  getById:      (id: string) => getWithCache<Order>(`/admin/orders/${id}`),
  getTimeline:  (id: string) => getWithCache<OrderTimeline[]>(`/admin/orders/${id}/timeline`),
  getPackingSlip:(id: string) => getWithCache<PackingSlip>(`/admin/orders/${id}/packing-slip`),

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
    return res;
  },

  bulkUpdateStatus: async (ids: string[], status: string) => {
    const res = await patch<{ updated: number }>('/admin/orders/status/bulk', { ids, status });
    invalidateAdminCache('/admin/orders');
    return res;
  },

  exportCsv: (params?: { dateFrom?: string; dateTo?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.fabricspeaks.com/api/v1';
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
  }, signal?: AbortSignal) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return getWithCache<{ items: Product[]; total: number }>(`/admin/products?${qs}`, signal);
  },

  getById:  (id: string) => getWithCache<Product>(`/admin/products/${id}`),

  create: async (data: Omit<Product, 'id'|'slug'|'createdAt'>) => {
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
  list:   () => getWithCache<Brand[]>('/admin/brands'),
  create: async (data: Omit<Brand,'id'>) => {
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
  list:   () => getWithCache<Category[]>('/admin/categories'),
  create: async (data: Omit<Category,'id'>) => {
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
  list:   () => getWithCache<Collection[]>('/admin/collections'),
  getById:(id: string) => getWithCache<Collection & { products: Product[] }>(`/admin/collections/${id}`),
  create: async (data: Omit<Collection,'id'|'productCount'>) => {
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
  addProduct:    async (id: string, productId: string) => {
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
  list: (params?: { status?: string; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return getWithCache<InventoryItem[]>(`/admin/inventory?${qs}`);
  },

  getHealth:  () => getWithCache<StockHealth>('/admin/inventory/stock-health'),

  adjust: async (variantId: string, data: {
    adjustmentQty: number;
    reason: string;
  }) => {
    const res = await post<InventoryItem>('/admin/inventory/adjust', { variantId, ...data });
    invalidateAdminCache('/admin/inventory');
    invalidateAdminCache('/admin/products'); // Stock adjustments affect products
    return res;
  },

  getAdjustments: (variantId: string) =>
    getWithCache<InventoryAdjustment[]>(`/admin/inventory/${variantId}/adjustments`),

  getExpected:  () => getWithCache<ExpectedStock[]>('/admin/inventory/expected-stock'),
  addExpected:  async (data: Omit<ExpectedStock,'id'>) => {
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
  list: (params?: { status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return getWithCache<{ items: Return[]; total: number }>(`/admin/returns?${qs}`);
  },

  getById:        (id: string) => getWithCache<Return>(`/admin/returns/${id}`),
  getTimeline:    (id: string) => getWithCache<ReturnTimeline[]>(`/admin/returns/${id}/timeline`),
  getRefundStatus:(id: string) => getWithCache<RefundStatus>(`/admin/returns/${id}/refund-status`),

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
  list: (params?: { status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return getWithCache<SupportCase[]>(`/admin/support/queries?${qs}`);
  },

  getById:        (id: string)          => getWithCache<SupportCase>(`/admin/support/queries/${id}`),
  updateStatus:   async (id: string, status: string) => {
    const res = await patch<SupportCase>(`/admin/support/queries/${id}`, { status });
    invalidateAdminCache('/admin/support/queries');
    return res;
  },

  addNote: async (id: string, note: string) => {
    const res = await post<SupportCase>(`/admin/support/queries/${id}/note`, { note });
    invalidateAdminCache(`/admin/support/queries/${id}`);
    return res;
  },

  lookupCustomer: (mobile: string) =>
    getWithCache<CustomerProfile>(`/admin/users/customers?mobile=${encodeURIComponent(mobile)}`),

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
  list:   () => getWithCache<Coupon[]>('/admin/coupons'),
  create: async (data: Omit<Coupon,'id'|'usedCount'|'createdAt'>) => {
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
  getAll:       () => getWithCache<StoreSettings>('/admin/settings'),
  update:       async (key: string, value: string | boolean | number) => {
    const res = await patch<StoreSettings>('/admin/settings', { key: String(key), value: String(value) });
    invalidateAdminCache('/admin/settings');
    return res;
  },
  getPublic:    () => getWithCache<Partial<StoreSettings>>('/admin/settings/public'),
};

// ─── Admin Users ──────────────────────────────────────────────────────────────

export const adminUsersApi = {
  list:       () => getWithCache<AdminUser[]>('/admin/users'),
  create:     async (data: Omit<AdminUser,'id'|'lastActiveAt'|'createdAt'>) => {
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
  list: (params?: { entity?: string; page?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return getWithCache<{ items: AuditLogEntry[]; total: number }>(`/admin/audit-log?${qs}`);
  },
};

// ─── Content Pages ────────────────────────────────────────────────────────────

export const contentApi = {
  list:     () => getWithCache<ContentPage[]>('/admin/pages'),
  getById:  (id: string) => getWithCache<ContentPage>(`/admin/pages/${id}`),
  create:   async (data: Omit<ContentPage,'id'|'updatedAt'>) => {
    const res = await post<ContentPage>('/admin/pages', data);
    invalidateAdminCache('/admin/pages');
    return res;
  },
  update:   async (id: string, data: Partial<ContentPage>) => {
    const res = await patch<ContentPage>(`/admin/pages/${id}`, data);
    invalidateAdminCache('/admin/pages');
    invalidateAdminCache(`/admin/pages/${id}`);
    return res;
  },
  publish:  async (id: string) => {
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
