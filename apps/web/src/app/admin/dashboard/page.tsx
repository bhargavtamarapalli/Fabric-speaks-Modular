'use client';

// app/admin/dashboard/page.tsx

import React from 'react';
import { WithRoleGuard } from '@/components/admin/WithRoleGuard';
import { THEME } from '@/lib/admin/theme';
import dynamic from 'next/dynamic';
import { dashboardApi } from '@/lib/admin/api';
import type { DashboardData } from '@/lib/admin/types';
import { PageHeader, Loader, ErrorBanner, MetricsGridSkeleton, MetricCardSkeleton, DataTableSkeleton } from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';
import { ServiceHealthPanel } from './_components/ServiceHealthPanel';

const MetricsGrid = dynamic(
  () => import('./_components/MetricsGrid').then(mod => mod.MetricsGrid),
  { loading: () => <MetricsGridSkeleton /> }
);
const StockHealthCard = dynamic(
  () => import('./_components/StockHealthCard').then(mod => mod.StockHealthCard),
  { loading: () => <MetricCardSkeleton /> }
);
const RecentOrdersCard = dynamic(
  () => import('./_components/RecentOrdersCard').then(mod => mod.RecentOrdersCard),
  { loading: () => <DataTableSkeleton rows={5} /> }
);
const PendingActionsGrid = dynamic(
  () => import('./_components/PendingActionsGrid').then(mod => mod.PendingActionsGrid),
  { loading: () => <div style={{ height: '100px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }} /> }
);

// ─── Dashboard ───────────────────────────────────────────────────────────────

import useSWR from 'swr';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <WithRoleGuard allowedRoles={['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SUPPORT_AGENT']}>
      <DashboardContent />
    </WithRoleGuard>
  );
}

function DashboardContent() {
  const fallbackData: DashboardData = {
    revenueToday: 0,
    revenueDelta: 0,
    ordersToday: 0,
    ordersDelta: 0,
    lowStockCount: 0,
    openReturns: 0,
    awaitingShiprocket: 0,
    codPending: 0,
    recentOrders: [],
    stockHealth: {
      critical: 0,
      warning: 0,
      healthy: 0,
      total: 0,
      items: [],
    },
  };

  const {
    data,
    error: swrError,
    isLoading,
    mutate
  } = useSWR('/admin/dashboard', () => dashboardApi.getData(), {
    refreshInterval: 300000,
    revalidateOnFocus: true,
    errorRetryCount: 3,
  });

  const error = swrError ? mapError(swrError) : null;
  const resolvedData = data ?? (error ? fallbackData : null);

  // Do not keep the dashboard trapped in spinner mode when the request errors.
  // On error we render fallback metrics + banner so the screen remains usable.
  if (isLoading && !data && !error) return <Loader />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Operations overview" />

      {error && (
        <div style={{ marginBottom: THEME.spacing.lg }}>
          <ErrorBanner message={error} onRetry={() => mutate()} />
        </div>
      )}

      {resolvedData && <PendingActionsGrid data={resolvedData} />}
      {resolvedData && <MetricsGrid data={resolvedData} />}

      {resolvedData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: THEME.spacing.sm }}>
          <RecentOrdersCard data={resolvedData} />
          <StockHealthCard data={resolvedData} />
        </div>
      )}

      <div style={{ marginTop: THEME.spacing.lg }}>
        <ServiceHealthPanel />
      </div>

    </div>
  );
}
