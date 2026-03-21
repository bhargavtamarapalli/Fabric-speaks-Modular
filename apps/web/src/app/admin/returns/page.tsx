'use client';

// app/admin/returns/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { returnsApi } from '@/lib/admin/api';
import type { Return } from '@/lib/admin/types';
import {
  PageHeader, Badge, DataTable, FilterChip, SearchInput,
  ActionButton, ErrorBanner, MonoText, useToast,
  formatDateTime,
} from '@/components/admin/shared';

const STATUS_FILTERS = [
  { label: 'All',               value: '' },
  { label: 'Requested',         value: 'RETURN_REQUESTED' },
  { label: 'Approved',          value: 'APPROVED' },
  { label: 'Pickup scheduled',  value: 'PICKUP_SCHEDULED' },
  { label: 'Received',          value: 'RETURN_RECEIVED' },
  { label: 'Refunded',          value: 'REFUNDED' },
  { label: 'Replaced',          value: 'REPLACEMENT_SENT' },
];

const STATUS_BADGE: Record<string, string> = {
  RETURN_REQUESTED:  'pending',
  APPROVED:          'confirmed',
  PICKUP_SCHEDULED:  'processing',
  RETURN_PICKED:     'processing',
  RETURN_RECEIVED:   'shipped',
  REFUND_INITIATED:  'info',
  REFUNDED:          'refunded',
  REPLACEMENT_SENT:  'delivered',
};

export default function ReturnsPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [returns,  setReturns]  = useState<Return[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState('');
  const [search,   setSearch]   = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await returnsApi.list({ status: filter || undefined });
      setReturns(res.items);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = returns.filter(r =>
    !search ||
    r.customer.name.toLowerCase().includes(search.toLowerCase()) ||
    r.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key:    'id',
      label:  'Return ID',
      width:  '100px',
      render: (r: Return) => <MonoText>{r.id}</MonoText>,
    },
    {
      key:    'order',
      label:  'Order',
      width:  '110px',
      render: (r: Return) => (
        <span
          onClick={e => { e.stopPropagation(); router.push(`/admin/orders/${r.orderId}`); }}
          style={{ color: THEME.colors.linen, fontFamily: THEME.fonts.mono, fontSize: THEME.fontSizes.sm, cursor: 'pointer' }}
        >
          {r.orderNumber}
        </span>
      ),
    },
    {
      key:    'customer',
      label:  'Customer',
      render: (r: Return) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>{r.customer.name}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{r.customer.mobile}</div>
        </div>
      ),
    },
    {
      key:    'product',
      label:  'Product',
      render: (r: Return) => (
        <div>
          <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>{r.product}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui }}>{r.size} · {r.colour}</div>
        </div>
      ),
    },
    {
      key:    'reason',
      label:  'Reason',
      render: (r: Return) => (
        <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui, maxWidth: '160px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.reason}
        </span>
      ),
    },
    {
      key:    'status',
      label:  'Status',
      width:  '160px',
      render: (r: Return) => (
        <Badge type={(STATUS_BADGE[r.status] ?? 'draft') as any}>
          {r.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key:    'resolution',
      label:  'Resolution',
      width:  '100px',
      render: (r: Return) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>
          {r.resolution ?? '—'}
        </span>
      ),
    },
    {
      key:    'days',
      label:  'Days open',
      width:  '90px',
      render: (r: Return) => (
        <span style={{ color: r.daysOpen > 3 ? THEME.colors.warning : THEME.colors.muted, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>
          {r.daysOpen}d
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Returns"
        subtitle={`${returns.filter(r => !['REFUNDED','REPLACEMENT_SENT'].includes(r.status)).length} open returns`}
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_FILTERS.map(f => (
          <FilterChip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
        ))}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Search by customer or order..." value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          empty="No returns found"
          onRowClick={r => router.push(`/admin/returns/${r.id}`)}
          rowKey={r => r.id}
        />
      </div>

      {ToastComponent}
    </div>
  );
}
