'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { ordersApi } from '@/lib/admin/api';
import {
  PageHeader,
  Badge,
  DataTable,
  ActionButton,
  ErrorBanner,
  MonoText,
  formatCurrency,
  formatDateTime,
} from '@/components/admin/shared';

import { useOrders } from './_hooks/useOrders';
import { OrderFilters } from './_components/OrderFilters';
import { BulkActions } from './_components/BulkActions';

const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: 'pending',
  CONFIRMED:       'confirmed',
  PROCESSING:      'processing',
  SHIPPED:         'shipped',
  DELIVERED:       'delivered',
  CANCELLED:       'cancelled',
};

export default function OrdersPage() {
  const router = useRouter();
  const {
    orders,
    total,
    loading,
    error,
    filters,
    updateFilters,
    selected,
    toggleSelect,
    clearSelection,
    bulkLoading,
    handleBulkShiprocket,
    load,
  } = useOrders();

  const columns = useMemo(() => [
    {
      key:    'select',
      label:  '',
      width:  '36px',
      render: (o: any) => (
        <input
          type="checkbox"
          checked={selected.includes(o.id)}
          onChange={() => toggleSelect(o.id)}
          onClick={e => e.stopPropagation()}
          style={{ accentColor: THEME.colors.linen, cursor: 'pointer' }}
        />
      ),
    },
    {
      key:    'orderNumber',
      label:  'Order',
      width:  '110px',
      render: (o: any) => <MonoText>{o.orderNumber}</MonoText>,
    },
    {
      key:    'customer',
      label:  'Customer',
      render: (o: any) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>{o.customer.name}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{o.customer.mobile}</div>
        </div>
      ),
    },
    {
      key:    'fabric',
      label:  'Fabric',
      width:  '90px',
      render: (o: any) => (
        <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>
          {o.items[0]?.fabricType ?? '—'}
        </span>
      ),
    },
    {
      key:    'total',
      label:  'Amount',
      width:  '90px',
      render: (o: any) => (
        <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{formatCurrency(o.total)}</span>
      ),
    },
    {
      key:    'status',
      label:  'Status',
      width:  '140px',
      render: (o: any) => (
        <Badge type={(STATUS_BADGE[o.status] ?? 'draft') as any}>
          {o.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key:    'time',
      label:  'Time',
      width:  '130px',
      render: (o: any) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
          {formatDateTime(o.createdAt)}
        </span>
      ),
    },
  ], [selected, toggleSelect]);

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${total} orders`}
        action={
          <ActionButton 
            onClick={() => window.open(ordersApi.exportCsv(), '_blank')} 
            variant="ghost"
          >
            Export CSV
          </ActionButton>
        }
      />

      {error && (
        <div style={{ marginBottom: '12px' }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <OrderFilters 
        filters={filters} 
        onFilterChange={updateFilters} 
      />

      <BulkActions
        selectedCount={selected.length}
        onBulkShiprocket={handleBulkShiprocket}
        onClearSelection={clearSelection}
        loading={bulkLoading}
      />

      <div style={{ 
        background: THEME.colors.surface3, 
        border: `1px solid ${THEME.colors.border}`, 
        borderRadius: THEME.radius.lg, 
        overflow: 'hidden' 
      }}>
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          onRowClick={o => router.push(`/admin/orders/${o.id}`)}
        />
      </div>
    </div>
  );
}
