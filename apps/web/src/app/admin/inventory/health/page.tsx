'use client';
// app/admin/inventory/health/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { inventoryApi } from '@/lib/admin/api';
import type { StockHealth, InventoryItem } from '@/lib/admin/types';
import {
  PageHeader, SectionCard, Badge, DataTable, FilterChip, SearchInput,
  ActionButton, ErrorBanner, Loader, MonoText, useToast,
} from '@/components/admin/shared';

export default function InventoryHealthPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [health,  setHealth]  = useState<StockHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState('');
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setHealth(await inventoryApi.getHealth());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load stock health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (health?.items ?? []).filter(i => {
    const matchSearch = !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || i.status === filter;
    return matchSearch && matchFilter;
  });

  const columns = [
    {
      key: 'product', label: 'Product',
      render: (i: InventoryItem) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.base }}>{i.productName}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui }}>{i.fabricType} · {i.colour} · {i.size}</div>
        </div>
      ),
    },
    {
      key: 'sku', label: 'SKU', width: '110px',
      render: (i: InventoryItem) => <MonoText color={THEME.colors.muted}>{i.sku}</MonoText>,
    },
    {
      key: 'stock', label: 'Stock', width: '80px',
      render: (i: InventoryItem) => (
        <span style={{ fontWeight: 700, fontFamily: THEME.fonts.ui, color: i.stockQty === 0 ? THEME.colors.error : i.stockQty < 5 ? THEME.colors.warning : THEME.colors.success }}>
          {i.stockQty}
        </span>
      ),
    },
    {
      key: 'avgDaily', label: 'Avg / day', width: '90px',
      render: (i: InventoryItem) => <span style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{i.avgDailySales.toFixed(1)}</span>,
    },
    {
      key: 'days', label: 'Days left', width: '90px',
      render: (i: InventoryItem) => {
        const d = i.daysRemaining;
        const color = d === null ? THEME.colors.muted : d <= 0 ? THEME.colors.error : d < 7 ? THEME.colors.warning : THEME.colors.ash;
        return <span style={{ color, fontFamily: THEME.fonts.ui, fontWeight: d !== null && d < 7 ? 600 : 400 }}>{d === null ? '—' : d <= 0 ? 'Out' : `${d}d`}</span>;
      },
    },
    {
      key: 'status', label: 'Status', width: '100px',
      render: (i: InventoryItem) => <Badge type={i.status.toLowerCase() as any}>{i.status.charAt(0) + i.status.slice(1).toLowerCase()}</Badge>,
    },
    {
      key: 'action', label: '', width: '100px',
      render: (i: InventoryItem) => (
        <button
          onClick={e => { e.stopPropagation(); router.push(`/admin/inventory?adjust=${i.variantId}`); }}
          style={{ background: 'none', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.sm, cursor: 'pointer', fontFamily: THEME.fonts.ui }}
        >
          Adjust →
        </button>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Stock health"
        subtitle="All variants by stock status"
        action={<ActionButton variant="ghost" onClick={() => router.push('/admin/inventory')}>← All inventory</ActionButton>}
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      {/* Summary bar */}
      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '9px', marginBottom: '14px' }}>
          {[
            { label: 'Critical (0 stock)', count: health.critical, color: THEME.colors.error,   bg: 'rgba(184,76,60,0.08)',  border: 'rgba(184,76,60,0.2)',  filter: 'CRITICAL' },
            { label: 'Warning (<5 units)', count: health.warning,  color: THEME.colors.warning, bg: 'rgba(120,90,30,0.08)', border: 'rgba(168,132,58,0.2)', filter: 'WARNING' },
            { label: 'Healthy',            count: health.healthy,  color: THEME.colors.success, bg: 'rgba(45,106,79,0.08)',  border: 'rgba(45,106,79,0.2)',  filter: 'HEALTHY' },
          ].map(row => (
            <div
              key={row.label}
              onClick={() => setFilter(prev => prev === row.filter ? '' : row.filter)}
              style={{ background: row.bg, border: `1px solid ${filter === row.filter ? row.color : row.border}`, borderRadius: THEME.radius.lg, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.12s' }}
            >
              <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginBottom: '4px' }}>{row.label}</div>
              <div style={{ fontSize: THEME.fontSizes.xl, color: row.color, fontFamily: THEME.fonts.display }}>{row.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Segmented progress bar */}
      {health && health.total > 0 && (
        <div style={{ height: '4px', display: 'flex', borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{ width: `${(health.critical / health.total) * 100}%`, background: THEME.colors.error }} />
          <div style={{ width: `${(health.warning  / health.total) * 100}%`, background: THEME.colors.warning }} />
          <div style={{ flex: 1, background: THEME.colors.success }} />
        </div>
      )}

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[{l:'All',v:''},{l:'Critical',v:'CRITICAL'},{l:'Warning',v:'WARNING'},{l:'Healthy',v:'HEALTHY'}].map(f => (
          <FilterChip key={f.v} label={f.l} active={filter === f.v} onClick={() => setFilter(f.v)} />
        ))}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Search product or SKU..." value={search} onChange={setSearch} />
        </div>
      </div>

      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={filtered} loading={false} empty="No items match filter" rowKey={i => i.variantId} />
      </div>

      {ToastComponent}
    </div>
  );
}
