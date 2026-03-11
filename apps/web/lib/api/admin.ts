import { apiFetch } from '../apiClient';

// Dashboard Metrics
export interface DashboardMetrics {
  ordersToday: number;
  revenueToday: string;
  lowStockCount: number;
  openReturnsCount: number;
}

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  return await apiFetch<DashboardMetrics>('GET', '/api/v1/admin/dashboard', undefined, { withCredentials: true });
};

// ... More will be added as we build SCR-28, SCR-20, etc.
