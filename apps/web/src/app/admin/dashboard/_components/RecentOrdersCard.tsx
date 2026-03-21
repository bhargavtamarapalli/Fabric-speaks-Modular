'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { SectionCard, DataTable, MonoText, Badge, formatCurrency, formatDateTime } from '@/components/admin/shared';
import type { DashboardData, Order } from '@/lib/admin/types';

interface RecentOrdersCardProps {
  data: DashboardData;
}

function orderStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'pending',
    CONFIRMED:       'confirmed',
    PROCESSING:      'processing',
    SHIPPED:         'shipped',
    DELIVERED:       'delivered',
    CANCELLED:       'cancelled',
  };
  return <Badge type={(map[status] ?? 'draft') as any}>{status.replace('_', ' ')}</Badge>;
}

/**
 * A table card displaying the most recent customer orders.
 * Navigates to individual order details on row click.
 * Memoized to prevent re-renders when parent updates with same data.
 */
export const RecentOrdersCard = memo(function RecentOrdersCard({ data }: RecentOrdersCardProps) {
  const router = useRouter();
  const handleRowClick     = useCallback((o: Order) => router.push(`/admin/orders/${o.id}`), [router]);
  const handleViewAllClick = useCallback(() => router.push('/admin/orders'), [router]);

  // Memoize columns definition to prevent recreation on each render
  const orderColumns = useMemo(() => [
    {
      key:    'order',
      label:  'Order',
      width:  '100px',
      render: (o: Order) => <MonoText>{o.orderNumber}</MonoText>,
    },
    {
      key:    'customer',
      label:  'Customer',
      width:  '140px',
      render: (o: Order) => (
        <span style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>
          {o.customer.name}
        </span>
      ),
    },
    {
      key:    'fabric',
      label:  'Fabric',
      width:  '90px',
      render: (o: Order) => (
        <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>
          {o.items[0]?.fabricType ?? '—'}
        </span>
      ),
    },
    {
      key:    'total',
      label:  'Amount',
      width:  '90px',
      render: (o: Order) => (
        <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>
          {formatCurrency(o.total)}
        </span>
      ),
    },
    {
      key:    'status',
      label:  'Status',
      width:  '130px',
      render: (o: Order) => orderStatusBadge(o.status),
    },
    {
      key:    'time',
      label:  'Time',
      render: (o: Order) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.mono }}>
          {formatDateTime(o.createdAt)}
        </span>
      ),
    },
  ], []);

  return (
    <SectionCard
      title="Recent orders"
      noPadding
      action={
        <span
          onClick={handleViewAllClick}
          style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, cursor: 'pointer' }}
        >
          View all →
        </span>
      }
    >
      <DataTable
        columns={orderColumns}
        data={data?.recentOrders ?? []}
        loading={false}
        empty="No orders today"
        onRowClick={handleRowClick}
        rowKey={o => o.id}
      />
    </SectionCard>
  );
});
