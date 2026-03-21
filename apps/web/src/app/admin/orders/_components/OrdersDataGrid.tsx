'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { DataTable, MonoText, Badge, formatCurrency, formatDateTime } from '@/components/admin/shared';
import type { Order } from '@/lib/admin/types';

interface OrdersDataGridProps {
  orders: Order[];
  loading: boolean;
  selected: string[];
  onToggleSelect: (id: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: 'pending',
  CONFIRMED:       'confirmed',
  PROCESSING:      'processing',
  SHIPPED:         'shipped',
  DELIVERED:       'delivered',
  CANCELLED:       'cancelled',
};

/**
 * A data table display for orders with multi-select support.
 * Encapsulates column definitions and row interaction logic.
 */
export function OrdersDataGrid({
  orders,
  loading,
  selected,
  onToggleSelect,
}: OrdersDataGridProps) {
  const router = useRouter();

  const columns = useMemo(() => [
    {
      key:    'select',
      label:  '',
      width:  '36px',
      render: (o: Order) => (
        <input
          type="checkbox"
          checked={selected.includes(o.id)}
          onChange={() => onToggleSelect(o.id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select order ${o.orderNumber}`}
          style={{ accentColor: THEME.colors.linen, cursor: 'pointer' }}
        />
      ),
    },
    {
      key:    'orderNumber',
      label:  'Order',
      width:  '110px',
      render: (o: Order) => <MonoText>{o.orderNumber}</MonoText>,
    },
    {
      key:    'customer',
      label:  'Customer',
      render: (o: Order) => (
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
        <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{formatCurrency(o.total)}</span>
      ),
    },
    {
      key:    'status',
      label:  'Status',
      width:  '140px',
      render: (o: Order) => (
        <Badge type={(STATUS_BADGE[o.status] ?? 'draft') as any}>
          {o.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key:    'time',
      label:  'Time',
      width:  '130px',
      render: (o: Order) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
          {formatDateTime(o.createdAt)}
        </span>
      ),
    },
  ], [selected, onToggleSelect]);

  const handleRowClick = React.useCallback((o: Order) => {
    router.push(`/admin/orders/${o.id}`);
  }, [router]);

  return (
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
        onRowClick={handleRowClick}
      />
    </div>
  );
}
