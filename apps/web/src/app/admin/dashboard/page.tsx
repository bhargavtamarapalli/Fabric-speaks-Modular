'use client';

// app/admin/dashboard/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { dashboardApi, ordersApi } from '@/lib/admin/api';
import type { DashboardData, Order } from '@/lib/admin/types';
import {
  PageHeader, MetricCard, SectionCard, Badge, DataTable,
  PendingWidget, ErrorBanner, Loader, MonoText,
  formatCurrency, formatDateTime, useToast,
} from '@/components/admin/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Components ──────────────────────────────────────────────────────────────

interface MetricsGridProps {
  data: DashboardData;
  router: ReturnType<typeof useRouter>;
}

function MetricsGrid({ data, router }: MetricsGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '9px', marginBottom: '14px' }}>
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
        onClick={() => router.push('/admin/inventory/health')}
      />
      <MetricCard
        label="Open returns"
        value={data.openReturns}
        accent={data.openReturns > 0 ? 'error' : 'success'}
        onClick={() => router.push('/admin/returns')}
      />
    </div>
  );
}

interface StockHealthCardProps {
  data: DashboardData;
  router: ReturnType<typeof useRouter>;
}

function StockHealthCard({ data, router }: StockHealthCardProps) {
  const criticalItems = data.stockHealth.items.filter(i => i.status === 'CRITICAL').slice(0, 3);

  return (
    <SectionCard
      title="Stock health"
      action={
        <span
          onClick={() => router.push('/admin/inventory/health')}
          style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, cursor: 'pointer' }}
        >
          Manage →
        </span>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: THEME.fontSizes.sm, color: THEME.colors.muted, marginBottom: '6px', fontFamily: THEME.fonts.ui }}>
        <span>{data.stockHealth.total} total variants</span>
        {data.stockHealth.critical > 0 && (
          <span style={{ color: THEME.colors.error }}>{data.stockHealth.critical} out of stock</span>
        )}
      </div>

      {/* Segmented bar */}
      <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
        {data.stockHealth.critical > 0 && (
          <div style={{ background: THEME.colors.error, width: `${(data.stockHealth.critical / data.stockHealth.total) * 100}%` }} />
        )}
        {data.stockHealth.warning > 0 && (
          <div style={{ background: THEME.colors.warning, width: `${(data.stockHealth.warning / data.stockHealth.total) * 100}%` }} />
        )}
        <div style={{ background: THEME.colors.success, flex: 1 }} />
      </div>

      {/* Legend */}
      {[
        { color: THEME.colors.error,   label: 'Critical (0 stock)', count: data.stockHealth.critical },
        { color: THEME.colors.warning,  label: 'Warning (<5 units)', count: data.stockHealth.warning },
        { color: THEME.colors.success,  label: 'Healthy',           count: data.stockHealth.healthy },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
            <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{row.label}</span>
          </div>
          <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{row.count}</span>
        </div>
      ))}

      {/* Critical items */}
      {criticalItems.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: '10px' }}>
          <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px', fontFamily: THEME.fonts.ui }}>Critical items</div>
          {criticalItems.map(item => (
            <div key={item.variantId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <div>
                <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{item.productName} · {item.size} {item.colour}</div>
                <MonoText>{item.sku}</MonoText>
              </div>
              <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.error, fontWeight: 600, fontFamily: THEME.fonts.ui }}>{item.stockQty} units</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

interface RecentOrdersCardProps {
  data: DashboardData;
  router: ReturnType<typeof useRouter>;
}

function RecentOrdersCard({ data, router }: RecentOrdersCardProps) {
  const orderColumns = [
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
  ];

  return (
    <SectionCard
      title="Recent orders"
      noPadding
      action={
        <span
          onClick={() => router.push('/admin/orders')}
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
        onRowClick={o => router.push(`/admin/orders/${o.id}`)}
        rowKey={o => o.id}
      />
    </SectionCard>
  );
}

interface PendingActionsGridProps {
  data: DashboardData;
  router: ReturnType<typeof useRouter>;
}

function PendingActionsGrid({ data, router }: PendingActionsGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', marginBottom: '14px' }}>
      {data.awaitingShiprocket > 0 && (
        <PendingWidget
          label="Awaiting Shiprocket"
          count={data.awaitingShiprocket}
          rows={data.recentOrders
            .filter(o => o.status === 'CONFIRMED' && !o.awbNumber)
            .slice(0, 2)
            .map(o => ({ left: `${o.orderNumber} · ${o.customer.name}`, right: formatCurrency(o.total) }))}
          onClick={() => router.push('/admin/orders?filter=awaiting_shiprocket')}
        />
      )}
      {data.codPending > 0 && (
        <PendingWidget
          label="COD pending confirmation"
          count={data.codPending}
          rows={data.recentOrders
            .filter(o => o.paymentMethod === 'COD' && o.status === 'PENDING_PAYMENT')
            .slice(0, 2)
            .map(o => ({ left: `${o.orderNumber} · ${o.customer.name}`, right: o.customer.mobile }))}
          onClick={() => router.push('/admin/orders?filter=cod_pending')}
        />
      )}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const d = await dashboardApi.getData();
      setData(d);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Operations overview" />

      {error && (
        <div style={{ marginBottom: '14px' }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      {data && <PendingActionsGrid data={data} router={router} />}
      {data && <MetricsGrid data={data} router={router} />}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '9px' }}>
          <RecentOrdersCard data={data} router={router} />
          <StockHealthCard data={data} router={router} />
        </div>
      )}

      {ToastComponent}
    </div>
  );
}
