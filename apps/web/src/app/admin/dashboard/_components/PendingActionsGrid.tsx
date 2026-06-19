'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PendingWidget, formatCurrency, THEME } from '@/components/admin/shared';
import type { DashboardData } from '@/lib/admin/types';

interface PendingActionsGridProps {
  data: DashboardData;
}

/**
 * A grid of action-oriented widgets for the dashboard.
 * Highlights tasks requiring immediate attention, like Shiprocket pushes and COD confirmations.
 * Memoized to prevent re-renders when parent updates with same data.
 */
export const PendingActionsGrid = memo(function PendingActionsGrid({ data }: PendingActionsGridProps) {
  const router = useRouter();
  const recentOrders = data.recentOrders ?? [];
  const awaitingShiprocket = Number(data.awaitingShiprocket ?? 0);
  const codPending = Number(data.codPending ?? 0);

  const shiprocketRows = React.useMemo(() => 
    recentOrders
      .filter(o => o.status === 'CONFIRMED' && !o.awbNumber)
      .slice(0, 2)
      .map(o => ({ left: `${o.orderNumber} · ${o.customer.name}`, right: formatCurrency(o.total) }))
  , [recentOrders]);

  const codRows = React.useMemo(() => 
    recentOrders
      .filter(o => o.paymentMethod === 'COD' && o.status === 'PENDING_PAYMENT')
      .slice(0, 2)
      .map(o => ({ left: `${o.orderNumber} · ${o.customer.name}`, right: o.customer.mobile }))
  , [recentOrders]);

  const handleShiprocketClick = React.useCallback(() => {
    router.push('/admin/orders?filter=awaiting_shiprocket');
  }, [router]);

  const handleCodClick = React.useCallback(() => {
    router.push('/admin/orders?filter=cod_pending');
  }, [router]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: THEME.spacing.sm, marginBottom: THEME.spacing.lg }}>
      {awaitingShiprocket > 0 && (
        <PendingWidget
          label='Awaiting Shiprocket'
          count={awaitingShiprocket}
          rows={shiprocketRows}
          onClick={handleShiprocketClick}
        />
      )}
      {codPending > 0 && (
        <PendingWidget
          label='COD pending confirmation'
          count={codPending}
          rows={codRows}
          onClick={handleCodClick}
        />
      )}
    </div>
  );
});
