'use client';

// app/admin/inventory/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { inventoryApi } from '@/lib/admin/api';
import type { InventoryItem } from '@/lib/admin/types';
import {
  PageHeader, Badge, DataTable, FilterChip, SearchInput,
  ActionButton, ErrorBanner, Loader, Drawer, FormField,
  TextInput, Textarea, Select, MonoText, useToast,
} from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

const PRESET_REASONS = [
  'Stock count correction',
  'Damaged goods removed',
  'New shipment received',
  'Return restocked',
  'Sample taken',
];

export default function InventoryPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [items,    setItems]    = useState<InventoryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState('');
  const [search,   setSearch]   = useState('');

  // Adjust drawer
  const [adjustItem,    setAdjustItem]    = useState<InventoryItem | null>(null);
  const [adjType,       setAdjType]       = useState<'add'|'remove'|'set'>('add');
  const [adjQty,        setAdjQty]        = useState('');
  const [adjReason,     setAdjReason]     = useState('');
  const [adjLoading,    setAdjLoading]    = useState(false);
  const [adjErrors,     setAdjErrors]     = useState<{ qty?: string; reason?: string }>({});

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await inventoryApi.list({ status: filter || undefined, search: search || undefined });
      setItems(res);
    } catch (e: any) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const newTotal = () => {
    if (!adjustItem || !adjQty) return adjustItem?.stockQty ?? 0;
    const q = parseInt(adjQty, 10) || 0;
    if (adjType === 'add')    return adjustItem.stockQty + q;
    if (adjType === 'remove') return Math.max(0, adjustItem.stockQty - q);
    return q; // set
  };

  const validateAdjustment = () => {
    const next: { qty?: string; reason?: string } = {};
    const qtyValue = parseInt(adjQty, 10);
    if (!adjQty.trim()) {
      next.qty = 'Quantity is required';
    } else if (Number.isNaN(qtyValue) || (adjType === 'set' ? qtyValue < 0 : qtyValue <= 0)) {
      next.qty = 'Quantity must be a positive number';
    }
    if (!adjReason.trim()) {
      next.reason = 'Reason is required';
    } else if (adjReason.trim().length < 10) {
      next.reason = 'Reason must be at least 10 characters';
    }
    return next;
  };

  const handleAdjust = async () => {
    if (!adjustItem) return;
    const validationErrors = validateAdjustment();
    if (Object.values(validationErrors).some(Boolean)) {
      setAdjErrors(validationErrors);
      return;
    }
    try {
      setAdjLoading(true);
      const q    = parseInt(adjQty, 10);
      const adj  = adjType === 'add' ? q : adjType === 'remove' ? -q : q - adjustItem.stockQty;
      await inventoryApi.adjust(adjustItem.variantId, {
        adjustmentQty: adjType === 'set' ? (q - adjustItem.stockQty) : (adjType === 'remove' ? -q : q),
        reason: adjReason,
      });
      showToast('Stock updated', 'success');
      setAdjustItem(null);
      setAdjQty('');
      setAdjReason('');
      load();
    } catch (e: any) {
      showToast(mapError(e), 'error');
    } finally {
      setAdjLoading(false);
    }
  };

  const filtered = items.filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  ).filter(i => !filter || i.status === filter);

  const columns = [
    {
      key:    'product',
      label:  'Product',
      render: (i: InventoryItem) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>{i.productName}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, marginTop: '1px' }}>{i.fabricType}</div>
        </div>
      ),
    },
    {
      key:    'variant',
      label:  'Variant',
      width:  '110px',
      render: (i: InventoryItem) => (
        <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>
          {i.colour} · {i.size}
        </span>
      ),
    },
    {
      key:    'sku',
      label:  'SKU',
      width:  '110px',
      render: (i: InventoryItem) => <MonoText color={THEME.colors.muted}>{i.sku}</MonoText>,
    },
    {
      key:    'stock',
      label:  'Stock',
      width:  '80px',
      render: (i: InventoryItem) => (
        <span style={{
          color:      i.stockQty === 0 ? THEME.colors.error : i.stockQty < 5 ? THEME.colors.warning : THEME.colors.success,
          fontWeight: 600,
          fontFamily: THEME.fonts.ui,
        }}>
          {i.stockQty}
        </span>
      ),
    },
    {
      key:    'daily',
      label:  'Avg/day',
      width:  '80px',
      render: (i: InventoryItem) => (
        <span style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{i.avgDailySales.toFixed(1)}</span>
      ),
    },
    {
      key:    'days',
      label:  'Days left',
      width:  '90px',
      render: (i: InventoryItem) => {
        const d = i.daysRemaining;
        const color = d === null ? THEME.colors.muted : d <= 0 ? THEME.colors.error : d < 7 ? THEME.colors.warning : THEME.colors.ash;
        return <span style={{ color, fontFamily: THEME.fonts.ui }}>{d === null ? '—' : d <= 0 ? 'Out' : `${d}d`}</span>;
      },
    },
    {
      key:    'status',
      label:  'Status',
      width:  '100px',
      render: (i: InventoryItem) => (
        <Badge type={i.status.toLowerCase() as any}>
          {i.status.charAt(0) + i.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key:    'action',
      label:  '',
      width:  '80px',
      render: (i: InventoryItem) => (
        <button
          onClick={e => { e.stopPropagation(); setAdjustItem(i); setAdjType('add'); setAdjQty(''); setAdjReason(''); setAdjErrors({}); }}
          style={{ background: 'none', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.sm, cursor: 'pointer', fontFamily: THEME.fonts.ui, padding: '2px 0' }}
        >
          Adjust →
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} variants · ${items.filter(i => i.status !== 'HEALTHY').length} need attention`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <ActionButton variant="ghost" onClick={() => router.push('/admin/inventory/health')}>Stock health</ActionButton>
            <ActionButton variant="ghost" onClick={() => router.push('/admin/inventory/expected')}>Expected stock</ActionButton>
          </div>
        }
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: 'All', value: '' },
          { label: 'Critical', value: 'CRITICAL' },
          { label: 'Warning', value: 'WARNING' },
          { label: 'Healthy', value: 'HEALTHY' },
        ].map(f => (
          <FilterChip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
        ))}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Search product or SKU..." value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={filtered} loading={loading} rowKey={i => i.variantId} />
      </div>

      {/* Adjust Drawer */}
      <Drawer open={!!adjustItem} onClose={() => { setAdjustItem(null); setAdjErrors({}); }} title={`Adjust stock — ${adjustItem?.productName ?? ''}`}>
        {adjustItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Current stock */}
            <div style={{ background: THEME.colors.bg, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.md, padding: '10px 12px' }}>
              <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginBottom: '2px' }}>Current stock</div>
              <div style={{ fontSize: THEME.fontSizes.xl, color: THEME.colors.ivory, fontFamily: THEME.fonts.display }}>{adjustItem.stockQty} units</div>
              <MonoText color={THEME.colors.muted}>{adjustItem.sku}</MonoText>
            </div>

            <FormField label="Adjustment type">
              <Select value={adjType} onChange={e => setAdjType(e.target.value as any)}>
                <option value="add">Add stock</option>
                <option value="remove">Remove stock</option>
                <option value="set">Set exact count</option>
              </Select>
            </FormField>

            <FormField label="Quantity" required error={adjErrors.qty} errorId="adjust-qty-error">
              <TextInput
                type="number"
                min="0"
                value={adjQty}
                onChange={e => { setAdjQty(e.target.value); setAdjErrors(p => ({ ...p, qty: '' })); }}
                placeholder={adjType === 'set' ? `Enter new total` : `Enter quantity`}
                aria-invalid={!!adjErrors.qty}
                aria-describedby={adjErrors.qty ? 'adjust-qty-error' : undefined}
              />
              {adjQty && (
                <div style={{ marginTop: '5px', fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>
                  New total: <strong style={{ color: newTotal() < 5 ? THEME.colors.warning : THEME.colors.success }}>{newTotal()} units</strong>
                </div>
              )}
            </FormField>

            <FormField label="Reason" required helper="Minimum 10 characters" error={adjErrors.reason} errorId="adjust-reason-error">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                {PRESET_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => { setAdjReason(r); setAdjErrors(p => ({ ...p, reason: '' })); }}
                    style={{ background: adjReason === r ? 'rgba(201,169,110,0.1)' : 'transparent', border: `1px solid ${adjReason === r ? THEME.colors.linen : THEME.colors.border2}`, color: adjReason === r ? THEME.colors.linen : THEME.colors.ash, fontSize: THEME.fontSizes.xs, padding: '3px 8px', borderRadius: THEME.radius.sm, cursor: 'pointer', fontFamily: THEME.fonts.ui }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Textarea
                value={adjReason}
                onChange={e => { setAdjReason(e.target.value); setAdjErrors(p => ({ ...p, reason: '' })); }}
                placeholder="Describe why stock is being adjusted..."
                rows={3}
                aria-invalid={!!adjErrors.reason}
                aria-describedby={adjErrors.reason ? 'adjust-reason-error' : undefined}
              />
            </FormField>

            <ActionButton
              onClick={handleAdjust}
              loading={adjLoading}
              fullWidth
            >
              Save adjustment
            </ActionButton>
          </div>
        )}
      </Drawer>

      {ToastComponent}
    </div>
  );
}
