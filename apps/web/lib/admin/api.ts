// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Admin API Client
// All admin API calls go through this file.
// Never use raw fetch in page components.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiError, apiClient } from '@/lib/apiClient';
import type {
  Order, OrderTimeline, PackingSlip,
  Product, Brand, Category, Collection,
  InventoryItem, StockHealth, InventoryAdjustment, ExpectedStock,
  Return, ReturnTimeline, RefundStatus,
  SupportCase, CustomerProfile,
  Coupon, StoreSettings, AdminUser, AdminRole,
  AuditLogEntry, DashboardData, ContentPage, AnalyticsData,
  CustomerSummary,
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
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes max for storage-to-memory persistence

// Synchronous initial load from sessionStorage if in browser
const initialCache = (() => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (!stored) return [];
    
    // Parse and filter out stale entries (Issue #8)
    const parsed = JSON.parse(stored);
    const now = Date.now();
    const validEntries = Object.entries(parsed).filter(([_, val]) => {
      const entry = val as { timestamp: number };
      // Keep only entries that are recent (e.g., last 5 mins) to prevent stale loads
      return entry && entry.timestamp && (now - entry.timestamp < CACHE_MAX_AGE);
    });
    
    return validEntries;
  } catch (err) {
    console.warn('[Admin API] Failed to load initial cache', err);
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
    // Issue #11: Silent failure check - provide warning
    console.warn('[Admin API] Failed to persist cache', err);
    
    // Self-healing: If storage quota is exceeded, clear the oldest entries
    if (err instanceof Error && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.log('[Admin API] Storage quota exceeded, clearing cache...');
      cache.clear();
      try { sessionStorage.removeItem(CACHE_KEY); } catch {}
    }
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

function inferServiceFromAdminApiUrl(url: string): string | null {
  if (url.startsWith('/admin/orders')) return 'ORDER';
  if (url.startsWith('/admin/products')) return 'CATALOG';
  if (url.startsWith('/admin/inventory')) return 'INVENTORY';
  if (url.startsWith('/admin/returns')) return 'RETURNS';
  if (url.startsWith('/admin/support')) return 'SUPPORT';
  if (url.startsWith('/admin/collections')) return 'CATALOG';
  if (url.startsWith('/admin/categories')) return 'CATALOG';
  if (url.startsWith('/admin/coupons')) return 'ADMIN';
  return null;
}

function normalizeAdminServiceError(url: string, error: unknown): never {
  if (!(error instanceof ApiError)) throw error;

  const service = inferServiceFromAdminApiUrl(url);
  if (!service) throw error;

  const status = error.statusCode;
  const isServiceDownStatus = status === 503 || status === 504;
  const isSupportRouteMissing = status === 404 && url.startsWith('/admin/support');

  if (isServiceDownStatus || isSupportRouteMissing) {
    throw new ApiError(
      'SERVICE_UNAVAILABLE',
      `${service} service is not running (HTTP ${status})`,
      status
    );
  }

  throw error;
}

const ADMIN_ROLE_TO_API: Record<AdminRole, string> = {
  SUPER_ADMIN: 'superAdmin',
  INVENTORY_MANAGER: 'inventoryManager',
  SUPPORT_AGENT: 'supportAgent',
};

const ADMIN_ROLE_FROM_API: Record<string, AdminRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  superAdmin: 'SUPER_ADMIN',
  inventoryManager: 'INVENTORY_MANAGER',
  supportAgent: 'SUPPORT_AGENT',
};

function normalizeAdminUser(user: AdminUser): AdminUser {
  const role = ADMIN_ROLE_FROM_API[(user.role as unknown as string) ?? ''] ?? 'SUPPORT_AGENT';
  return {
    ...user,
    role,
    email: user.email ?? null,
    name: user.name ?? 'Unknown',
  };
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
const _get = async <T>(url: string, signal?: AbortSignal) => {
  try {
    return await apiClient.get<any, T>(url, { signal });
  } catch (error) {
    normalizeAdminServiceError(url, error);
  }
};

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
const post = async <T>(url: string, data?: any) => {
  try {
    return await apiClient.post<any, T>(url, data);
  } catch (error) {
    normalizeAdminServiceError(url, error);
  }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patch = async <T>(url: string, data?: any) => {
  try {
    return await apiClient.patch<any, T>(url, data);
  } catch (error) {
    normalizeAdminServiceError(url, error);
  }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const del = async <T>(url: string) => {
  try {
    return await apiClient.delete<any, T>(url);
  } catch (error) {
    normalizeAdminServiceError(url, error);
  }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getData: async (signal?: AbortSignal) => {
    const raw = await getWithCache<any>('/admin/dashboard/ops', signal);
    return normalizeDashboardData(raw);
  },
  getPendingActions: (signal?: AbortSignal) => getWithCache<DashboardData>('/admin/dashboard/pending-actions', signal),
  getAnalytics: (range: '7d' | '30d' | '90d', signal?: AbortSignal) =>
    getWithCache<AnalyticsData>(`/admin/analytics?range=${range}`, signal),
};

function normalizeDashboardData(raw: any): DashboardData {
  const revenue = raw?.revenue ?? {};
  const comparisons = raw?.comparisons ?? {};
  const daily = comparisons?.yesterday ?? {};
  const cod = raw?.cod ?? {};

  return {
    revenueToday: Number(revenue.totalRevenue ?? 0),
    revenueDelta: Number(daily.revenueDeltaPct ?? 0),
    ordersToday: Number(revenue.orderCount ?? 0),
    ordersDelta: Number(daily.ordersDeltaPct ?? 0),
    lowStockCount: 0,
    openReturns: 0,
    awaitingShiprocket: Number(raw?.shiprocketIssues ?? 0),
    codPending: Number(cod.pending_confirmation ?? 0),
    recentOrders: [],
    stockHealth: {
      critical: 0,
      warning: 0,
      healthy: 0,
      total: 0,
      items: [],
    },
  };
}

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
    const endpoint = `/admin/coupons${qs ? `?${qs}` : ''}`;
    return getWithCache<any>(endpoint, signal).catch(async (error) => {
      // Compatibility fallback: some environments reject paginated query params.
      if (error instanceof ApiError && error.statusCode === 400 && qs) {
        return getWithCache<any>('/admin/coupons', signal);
      }
      throw error;
    }).then((raw) => {
        const items = (raw?.items ?? []).map((coupon: any): Coupon => ({
        id: String(coupon?.id ?? ''),
        code: String(coupon?.code ?? ''),
          discountType: coupon?.discountType === 'FIXED' ? 'FLAT' : 'PERCENTAGE',
          discountValue: Number(coupon?.discountValue ?? 0),
          maxDiscount: coupon?.maxDiscount !== null && coupon?.maxDiscount !== undefined ? Number(coupon.maxDiscount) : null,
          minOrderValue: Number(coupon?.minOrderAmount ?? 0),
        usageLimit: Number(coupon?.maxUsesTotal ?? 0),
        usedCount: Number(coupon?.usesCount ?? 0),
        perUserLimit: Number(coupon?.maxUsesPerUser ?? 1),
        expiresAt: String(coupon?.validUntil ?? coupon?.createdAt ?? new Date().toISOString()),
        isActive: Boolean(coupon?.isActive),
        createdAt: String(coupon?.createdAt ?? new Date().toISOString()),
      }));

      const total = Number(raw?.total ?? items.length);
      const page = Number(raw?.page ?? params?.page ?? 1);
      const limit = Number(raw?.limit ?? params?.limit ?? 20);
      const totalPages = Number(raw?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1))));

      return { items, total, page, limit, totalPages };
    });
  },
  create: async (data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>) => {
    const nowIso = new Date().toISOString();
      const payload = {
        code: data.code,
        discountType: data.discountType === 'FLAT' ? 'FIXED' : 'PERCENT',
        discountValue: data.discountValue,
        maxDiscount: data.discountType === 'PERCENTAGE' && data.maxDiscount && data.maxDiscount > 0 ? data.maxDiscount : undefined,
        minOrderAmount: data.minOrderValue ?? 0,
      maxUsesTotal: data.usageLimit > 0 ? data.usageLimit : undefined,
      maxUsesPerUser: data.perUserLimit > 0 ? data.perUserLimit : 1,
      validFrom: nowIso,
      validUntil: data.expiresAt,
    };
    const res = await post<any>('/admin/coupons', payload);
    invalidateAdminCache('/admin/coupons');
    return {
      id: String(res?.id ?? ''),
      code: String(res?.code ?? ''),
        discountType: res?.discountType === 'FIXED' ? 'FLAT' : 'PERCENTAGE',
        discountValue: Number(res?.discountValue ?? 0),
        maxDiscount: res?.maxDiscount !== null && res?.maxDiscount !== undefined ? Number(res.maxDiscount) : null,
        minOrderValue: Number(res?.minOrderAmount ?? 0),
      usageLimit: Number(res?.maxUsesTotal ?? 0),
      usedCount: Number(res?.usesCount ?? 0),
      perUserLimit: Number(res?.maxUsesPerUser ?? 1),
      expiresAt: String(res?.validUntil ?? nowIso),
      isActive: Boolean(res?.isActive),
      createdAt: String(res?.createdAt ?? nowIso),
    } as Coupon;
  },
  update: async (id: string, data: Partial<Coupon>) => {
    const payload: Record<string, unknown> = {};
      if (data.isActive !== undefined) payload.isActive = data.isActive;
      if (data.expiresAt !== undefined) payload.validUntil = data.expiresAt;
      if (data.usageLimit !== undefined && data.usageLimit > 0) payload.maxUsesTotal = data.usageLimit;
      if (data.maxDiscount !== undefined) payload.maxDiscount = data.maxDiscount;

    const res = await patch<any>(`/admin/coupons/${id}`, payload);
    invalidateAdminCache('/admin/coupons');
    return {
      id: String(res?.id ?? id),
      code: String(res?.code ?? ''),
        discountType: res?.discountType === 'FIXED' ? 'FLAT' : 'PERCENTAGE',
        discountValue: Number(res?.discountValue ?? 0),
        maxDiscount: res?.maxDiscount !== null && res?.maxDiscount !== undefined ? Number(res.maxDiscount) : null,
        minOrderValue: Number(res?.minOrderAmount ?? 0),
      usageLimit: Number(res?.maxUsesTotal ?? 0),
      usedCount: Number(res?.usesCount ?? 0),
      perUserLimit: Number(res?.maxUsesPerUser ?? 1),
      expiresAt: String(res?.validUntil ?? new Date().toISOString()),
      isActive: Boolean(res?.isActive),
      createdAt: String(res?.createdAt ?? new Date().toISOString()),
    } as Coupon;
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
  list: (params?: { role?: string; search?: string; page?: number; limit?: number }, signal?: AbortSignal) => {
    const qs = buildQueryString({
      ...(params?.role ? { 'filter[role]': params.role } : {}),
      ...(params?.search ? { 'filter[search]': params.search } : {}),
      ...(params?.page ? { page: params.page } : {}),
      ...(params?.limit ? { limit: params.limit } : {}),
    } as Record<string, string | number | undefined>);
    return getWithCache<{ items: AdminUser[]; meta?: { total: number; page: number; limit: number } }>(`/admin/users${qs ? `?${qs}` : ''}`, signal)
      .then((response) => {
        const items = (response?.items ?? []).map(normalizeAdminUser);
        const fallbackPage = params?.page ?? 1;
        const fallbackLimit = params?.limit ?? 20;
        return {
          items,
          meta: response?.meta ?? { total: items.length, page: fallbackPage, limit: fallbackLimit },
        };
      });
  },
  create: async (data: { name: string; email?: string; mobile: string; role: AdminRole }) => {
    const payload = {
      ...data,
      role: ADMIN_ROLE_TO_API[data.role],
    };
    const res = await post<AdminUser>('/admin/users', payload);
    invalidateAdminCache('/admin/users');
    return normalizeAdminUser(res);
  },
  updateRole: async (id: string, role: string) => {
    const res = await patch<AdminUser>(`/admin/users/${id}/role`, { role: ADMIN_ROLE_TO_API[role as AdminRole] ?? role });
    invalidateAdminCache('/admin/users');
    return normalizeAdminUser(res);
  },
  deactivate: async (id: string) => {
    const res = await del<AdminUser>(`/admin/users/${id}`);
    invalidateAdminCache('/admin/users');
    return normalizeAdminUser(res);
  },
};

export const customersApi = {
  search: (query: string, signal?: AbortSignal) =>
    getWithCache<CustomerSummary[]>(`/admin/customers/lookup?q=${encodeURIComponent(query)}`, signal),
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
  list: (signal?: AbortSignal) => getWithCache<ContentPage[]>('/admin/content/pages', signal),
  getById: (id: string, signal?: AbortSignal) => getWithCache<ContentPage>(`/admin/content/pages/${id}`, signal),
  create: async (data: Omit<ContentPage, 'id' | 'updatedAt'>) => {
    const res = await post<ContentPage>('/admin/content/pages', data);
    invalidateAdminCache('/admin/content/pages');
    return res;
  },
  update: async (id: string, data: Partial<ContentPage>) => {
    const res = await patch<ContentPage>(`/admin/content/pages/${id}`, data);
    invalidateAdminCache('/admin/content/pages');
    invalidateAdminCache(`/admin/content/pages/${id}`);
    return res;
  },
  publish: async (id: string) => {
    const res = await patch<ContentPage>(`/admin/content/pages/${id}`, { publishedAt: new Date().toISOString() });
    invalidateAdminCache('/admin/content/pages');
    invalidateAdminCache(`/admin/content/pages/${id}`);
    return res;
  },
  unpublish: async (id: string) => {
    const res = await patch<ContentPage>(`/admin/content/pages/${id}`, { publishedAt: null });
    invalidateAdminCache('/admin/content/pages');
    invalidateAdminCache(`/admin/content/pages/${id}`);
    return res;
  },
};
