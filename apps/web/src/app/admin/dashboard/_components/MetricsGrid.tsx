'use client';

import React, { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MetricCard, formatCurrency, THEME } from '@/components/admin/shared';
import type { DashboardData } from '@/lib/admin/types';

interface MetricsGridProps {
  data: DashboardData;
}

/**
 * A grid of high-level metrics for the dashboard.
 * Includes Revenue, Orders, Low Stock, and Open Returns.
 * Memoized to prevent re-renders when parent updates with same data.
 */
export const MetricsGrid = memo(function MetricsGrid({ data }: MetricsGridProps) {
  const router = useRouter();

  const handleInventoryClick = React.useCallback(() => {
    router.push('/admin/inventory/health');
  }, [router]);

  const handleReturnsClick = React.useCallback(() => {
    router.push('/admin/returns');
  }, [router]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: THEME.spacing.sm, marginBottom: THEME.spacing.lg }}>
      <MetricCard
        label="Revenue today"
        value={formatCurrency(data.revenueToday)}
        delta={data.revenueDelta}
      />
      <MetricCard
        label="Orders today"
        value={data.ordersToday}
        delta={data.ordersDelta}
      />
      <MetricCard
        label="Low stock items"
        value={data.lowStockCount}
        accent={data.lowStockCount > 0 ? 'warning' : 'success'}
        onClick={handleInventoryClick}
      />
      <MetricCard
        label="Open returns"
        value={data.openReturns}
        accent={data.openReturns > 0 ? 'error' : 'success'}
        onClick={handleReturnsClick}
      />
    </div>
  );
});
