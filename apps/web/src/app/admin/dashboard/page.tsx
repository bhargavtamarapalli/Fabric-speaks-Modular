'use client';

// app/admin/dashboard/page.tsx

import React from 'react';
import { WithRoleGuard } from '@/components/admin/WithRoleGuard';
import { THEME } from '@/lib/admin/theme';
import dynamic from 'next/dynamic';
import { dashboardApi } from '@/lib/admin/api';
import { PageHeader, Loader, ErrorBanner, useToast, MetricsGridSkeleton, MetricCardSkeleton, DataTableSkeleton } from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

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

  if (isLoading && !data) return <Loader />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Operations overview" />

      {error && (
        <div style={{ marginBottom: THEME.spacing.lg }}>
          <ErrorBanner message={error} onRetry={() => mutate()} />
        </div>
      )}

      {data && <PendingActionsGrid data={data} />}
      {data && <MetricsGrid data={data} />}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: THEME.spacing.sm }}>
          <RecentOrdersCard data={data} />
          <StockHealthCard data={data} />
        </div>
      )}

    </div>
  );
}
