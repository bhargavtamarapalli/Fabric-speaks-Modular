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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const get = <T>(url: string) => apiClient.get<any, T>(url);
const post = <T>(url: string, data?: any) => apiClient.post<any, T>(url, data);
const patch = <T>(url: string, data?: any) => apiClient.patch<any, T>(url, data);
const del = <T>(url: string) => apiClient.delete<any, T>(url);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getData:        ()        => get<DashboardData>('/admin/dashboard'),
  getPendingActions: ()     => get<DashboardData>('/admin/dashboard/pending-actions'),
  getAnalytics:   (range: '7d'|'30d'|'90d') =>
    get<AnalyticsData>(`/admin/analytics?range=${range}`),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<{ items: Order[]; total: number }>(`/admin/orders?${qs}`);
  },

  getById:      (id: string) => get<Order>(`/admin/orders/${id}`),
  getTimeline:  (id: string) => get<OrderTimeline[]>(`/admin/orders/${id}/timeline`),
  getPackingSlip:(id: string) => get<PackingSlip>(`/admin/orders/${id}/packing-slip`),

  updateStatus: (id: string, status: string) =>
    patch<Order>(`/admin/orders/${id}/status`, { status }),

  cancel: (id: string, reason: string) =>
    patch<Order>(`/admin/orders/${id}/cancel`, { reason }),

  pushToShiprocket: (id: string) =>
    post<Order>(`/admin/orders/${id}/shiprocket`, {}),

  bulkPushShiprocket: (ids: string[]) =>
    post<{ pushed: number }>('/admin/orders/shiprocket/bulk', { ids }),

  bulkUpdateStatus: (ids: string[], status: string) =>
    patch<{ updated: number }>('/admin/orders/status/bulk', { ids, status }),

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
  }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<{ items: Product[]; total: number }>(`/admin/products?${qs}`);
  },

  getById:  (id: string) => get<Product>(`/admin/products/${id}`),

  create: (data: Omit<Product, 'id'|'slug'|'createdAt'>) =>
    post<Product>('/admin/products', data),

  update: (id: string, data: Partial<Product>) =>
    patch<Product>(`/admin/products/${id}`, data),

  deactivate: (id: string, confirm: boolean = false) =>
    post<{ items: Product[]; total: number }>(`/admin/products/${id}/deactivate`, { confirm }),

  bulkUpdateVariants: (id: string, variants: {
    variantId: string;
    stockQty?: number;
    price?: number;
    comparePrice?: number;
    colourImageUrl?: string;
  }[]) => patch<{ updated: number }>(`/admin/products/${id}/variants/bulk`, { variants }),

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
  list:   ()                           => get<Brand[]>('/admin/brands'),
  create: (data: Omit<Brand,'id'>)     => post<Brand>('/admin/brands', data),
  update: (id: string, data: Partial<Brand>) => patch<Brand>(`/admin/brands/${id}`, data),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list:   ()                               => get<Category[]>('/admin/categories'),
  create: (data: Omit<Category,'id'>)      => post<Category>('/admin/categories', data),
  update: (id: string, data: Partial<Category>) =>
    patch<Category>(`/admin/categories/${id}`, data),
};

// ─── Collections ─────────────────────────────────────────────────────────────

export const collectionsApi = {
  list:   ()                                   => get<Collection[]>('/admin/collections'),
  getById:(id: string)                          => get<Collection & { products: Product[] }>(`/admin/collections/${id}`),
  create: (data: Omit<Collection,'id'|'productCount'>) =>
    post<Collection>('/admin/collections', data),
  update: (id: string, data: Partial<Collection>) =>
    patch<Collection>(`/admin/collections/${id}`, data),
  addProduct:    (id: string, productId: string) =>
    post<void>(`/admin/collections/${id}/products`, { productId }),
  removeProduct: (id: string, productId: string) =>
    del<void>(`/admin/collections/${id}/products/${productId}`),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  list: (params?: { status?: string; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<InventoryItem[]>(`/admin/inventory?${qs}`);
  },

  getHealth:  () => get<StockHealth>('/admin/inventory/stock-health'),

  adjust: (variantId: string, data: {
    adjustmentQty: number;
    reason: string;
  }) => post<InventoryItem>('/admin/inventory/adjust', { variantId, ...data }),

  getAdjustments: (variantId: string) =>
    get<InventoryAdjustment[]>(`/admin/inventory/${variantId}/adjustments`),

  getExpected:  ()                           => get<ExpectedStock[]>('/admin/inventory/expected-stock'),
  addExpected:  (data: Omit<ExpectedStock,'id'>) =>
    post<ExpectedStock>('/admin/inventory/expected-stock', data),
  updateExpectedStatus: (id: string, status: string) =>
    patch<ExpectedStock>(`/admin/inventory/expected-stock/${id}/status`, { status }),
};

// ─── Returns ─────────────────────────────────────────────────────────────────

export const returnsApi = {
  list: (params?: { status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<{ items: Return[]; total: number }>(`/admin/returns?${qs}`);
  },

  getById:        (id: string) => get<Return>(`/admin/returns/${id}`),
  getTimeline:    (id: string) => get<ReturnTimeline[]>(`/admin/returns/${id}/timeline`),
  getRefundStatus:(id: string) => get<RefundStatus>(`/admin/returns/${id}/refund-status`),

  updateStatus: (id: string, status: string) =>
    patch<Return>(`/admin/returns/${id}/status`, { status }),

  schedulePickup: (id: string) =>
    post<Return>(`/admin/returns/${id}/shiprocket`, {}),

  resolve: (id: string, resolution: 'REFUND' | 'REPLACEMENT') =>
    post<Return>(`/admin/returns/${id}/resolve`, { resolution }),
};

// ─── Support ─────────────────────────────────────────────────────────────────

export const supportApi = {
  list: (params?: { status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<SupportCase[]>(`/admin/support/queries?${qs}`);
  },

  getById:        (id: string)          => get<SupportCase>(`/admin/support/queries/${id}`),
  updateStatus:   (id: string, status: string) =>
    patch<SupportCase>(`/admin/support/queries/${id}`, { status }),

  addNote: (id: string, note: string) =>
    post<SupportCase>(`/admin/support/queries/${id}/note`, { note }),

  lookupCustomer: (mobile: string) =>
    get<CustomerProfile>(`/admin/users/customers?mobile=${encodeURIComponent(mobile)}`),

  addCustomerNote: (mobile: string, note: string) =>
    post<void>(`/admin/users/customers/${encodeURIComponent(mobile)}/note`, { note }),

  addCustomerTag: (mobile: string, tag: string) =>
    post<void>(`/admin/users/customers/${encodeURIComponent(mobile)}/tag`, { tag }),
};

// ─── Coupons ─────────────────────────────────────────────────────────────────

export const couponsApi = {
  list:   ()                            => get<Coupon[]>('/admin/coupons'),
  create: (data: Omit<Coupon,'id'|'usedCount'|'createdAt'>) =>
    post<Coupon>('/admin/coupons', data),
  update: (id: string, data: Partial<Coupon>) =>
    patch<Coupon>(`/admin/coupons/${id}`, data),
  deactivate: (id: string) =>
    patch<Coupon>(`/admin/coupons/${id}`, { isActive: false }),
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsApi = {
  getAll:       ()                              => get<StoreSettings>('/admin/settings'),
  update:       (key: string, value: string | boolean | number) =>
    patch<StoreSettings>('/admin/settings', { key: String(key), value: String(value) }),
  getPublic:    ()                              => get<Partial<StoreSettings>>('/admin/settings/public'),
};

// ─── Admin Users ──────────────────────────────────────────────────────────────

export const adminUsersApi = {
  list:       ()                              => get<AdminUser[]>('/admin/users'),
  create:     (data: Omit<AdminUser,'id'|'lastActiveAt'|'createdAt'>) =>
    post<AdminUser>('/admin/users', data),
  updateRole: (id: string, role: string)      =>
    patch<AdminUser>(`/admin/users/${id}/role`, { role }),
  deactivate: (id: string)                    =>
    patch<AdminUser>(`/admin/users/${id}`, { isActive: false }),
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: { entity?: string; page?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<{ items: AuditLogEntry[]; total: number }>(`/admin/audit-log?${qs}`);
  },
};

// ─── Content Pages ────────────────────────────────────────────────────────────

export const contentApi = {
  list:     ()                                  => get<ContentPage[]>('/admin/pages'),
  getById:  (id: string)                        => get<ContentPage>(`/admin/pages/${id}`),
  create:   (data: Omit<ContentPage,'id'|'updatedAt'>) =>
    post<ContentPage>('/admin/pages', data),
  update:   (id: string, data: Partial<ContentPage>) =>
    patch<ContentPage>(`/admin/pages/${id}`, data),
  publish:  (id: string)                        =>
    patch<ContentPage>(`/admin/pages/${id}`, { publishedAt: new Date().toISOString() }),
  unpublish:(id: string)                        =>
    patch<ContentPage>(`/admin/pages/${id}`, { publishedAt: null }),
};
