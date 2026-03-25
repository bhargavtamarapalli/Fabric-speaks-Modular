'use client';
// app/admin/inventory/expected/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { inventoryApi } from '@/lib/admin/api';
import { useAdminAuth } from '@/context/AdminAuthContext';
import type { ExpectedStock, ExpectedStockStatus } from '@/lib/admin/types';
import {
  PageHeader, Badge, DataTable, FilterChip, ActionButton, ErrorBanner,
  Drawer, FormField, TextInput, Textarea, Select, MonoText, useToast,
  formatDate,
} from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

const STATUS_BADGE: Record<ExpectedStockStatus, string> = {
  ORDERED: 'pending',
  IN_TRANSIT: 'processing',
  RECEIVED: 'delivered',
};

const INITIAL_FORM = {
  variantId: '',
  productName: '',
  size: '',
  colour: '',
  sku: '',
  supplierName: '',
  qtyExpected: '',
  expectedArrival: '',
  notes: '',
};

type ExpectedForm = typeof INITIAL_FORM;
type ExpectedFormErrors = Partial<Record<keyof ExpectedForm, string>>;

export default function ExpectedStockPage() {
  // ===== ALL HOOKS MUST BE AT THE TOP, BEFORE ANY CONDITIONAL LOGIC =====

  const router = useRouter();
  const { role, loading: authLoading } = useAdminAuth();
  const { showToast, ToastComponent } = useToast();

  const [items, setItems] = useState<ExpectedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpectedForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<ExpectedFormErrors>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setItems(await inventoryApi.getExpected());
    } catch (e: any) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ===== NOW SAFE TO DO CONDITIONAL LOGIC =====

  // Role gate: only INVENTORY_MANAGER and SUPER_ADMIN can access
  const isAuthorized = role === 'SUPER_ADMIN' || role === 'INVENTORY_MANAGER';

  if (!authLoading && !isAuthorized) {
    return (
      <div style={{ padding: THEME.spacing.lg, textAlign: 'center' }}>
        <p style={{ color: THEME.colors.error, fontFamily: THEME.fonts.ui }}>
          You do not have permission to access this page.
        </p>
        <ActionButton onClick={() => router.push('/admin/dashboard')} style={{ marginTop: THEME.spacing.md }}>
          Back to Dashboard
        </ActionButton>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={{ padding: THEME.spacing.lg, textAlign: 'center' }}>
        <p style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>Loading...</p>
      </div>
    );
  }

  const validate = (values: ExpectedForm): ExpectedFormErrors => {
    const next: ExpectedFormErrors = {};
    if (!values.sku.trim()) next.sku = 'SKU is required';
    if (!values.qtyExpected.trim()) next.qtyExpected = 'Qty expected is required';
    if (values.qtyExpected && Number(values.qtyExpected) <= 0) next.qtyExpected = 'Qty expected must be a positive number';
    if (!values.expectedArrival) next.expectedArrival = 'Expected arrival is required';
    return next;
  };

  const updateField = <K extends keyof ExpectedForm>(key: K, value: ExpectedForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const validateQtyExpected = (value: string) => {
    if (!value?.trim()) {
      setErrors(p => ({ ...p, qtyExpected: 'Qty expected is required' }));
      return;
    }

    const numValue = Number(value);
    if (!Number.isInteger(numValue) || numValue <= 0) {
      setErrors(p => ({ ...p, qtyExpected: 'Qty expected must be a positive integer' }));
      return;
    }

    setErrors(p => ({ ...p, qtyExpected: '' }));
  };

  const handleCreate = async () => {
    const validationErrors = validate(form);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }
    try {
      setSaving(true);
      await inventoryApi.addExpected({
        variantId: form.variantId,
        productName: form.productName,
        size: form.size,
        colour: form.colour,
        sku: form.sku,
        supplierName: form.supplierName,
        qtyExpected: parseInt(form.qtyExpected, 10),
        expectedArrival: new Date(form.expectedArrival).toISOString(),
        status: 'ORDERED',
        notes: form.notes || null,
      });
      showToast('Expected stock added', 'success');
      setShowForm(false);
      setForm(INITIAL_FORM);
      setErrors({});
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await inventoryApi.updateExpectedStatus(id, status);
      showToast('Status updated', 'success');
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Failed', 'error');
    }
  };

  const filtered = items.filter(i => !filter || i.status === filter);

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    const d = Math.ceil(diff / 86400000);
    return d;
  };

  const columns = [
    {
      key: 'product', label: 'Product',
      render: (i: ExpectedStock) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{i.productName}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, marginTop: '1px' }}>{i.colour} · {i.size}</div>
        </div>
      ),
    },
    { key: 'sku', label: 'SKU', width: '110px', render: (i: ExpectedStock) => <MonoText color={THEME.colors.muted}>{i.sku}</MonoText> },
    { key: 'supplier', label: 'Supplier', width: '130px', render: (i: ExpectedStock) => <span style={{ color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{i.supplierName || '—'}</span> },
    {
      key: 'qty', label: 'Qty', width: '70px',
      render: (i: ExpectedStock) => <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 600 }}>{i.qtyExpected}</span>,
    },
    {
      key: 'arrival', label: 'Expected', width: '130px',
      render: (i: ExpectedStock) => {
        const d = daysUntil(i.expectedArrival);
        return (
          <div>
            <div style={{ color: THEME.colors.ash, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm }}>{formatDate(i.expectedArrival)}</div>
            <div style={{ color: d < 0 ? THEME.colors.error : d <= 3 ? THEME.colors.warning : THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui }}>
              {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Today' : `in ${d}d`}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status', label: 'Status', width: '120px',
      render: (i: ExpectedStock) => <Badge type={(STATUS_BADGE[i.status] ?? 'draft') as any}>{i.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'action', label: '', width: '120px',
      render: (i: ExpectedStock) => (
        <Select
          value={i.status}
          onChange={e => { e.stopPropagation(); handleStatusUpdate(i.id, e.target.value); }}
          style={{ fontSize: THEME.fontSizes.xs, padding: '3px 8px' }}
        >
          <option value="ORDERED">Ordered</option>
          <option value="IN_TRANSIT">In transit</option>
          <option value="RECEIVED">Received</option>
        </Select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expected stock"
        subtitle="Upcoming inventory from suppliers"
        action={<ActionButton onClick={() => { setForm(INITIAL_FORM); setErrors({}); setShowForm(true); }}>+ Add expected stock</ActionButton>}
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      {/* Overdue alert */}
      {items.filter(i => i.status !== 'RECEIVED' && daysUntil(i.expectedArrival) < 0).length > 0 && (
        <div style={{ background: 'rgba(184,76,60,0.07)', border: `1px solid rgba(184,76,60,0.2)`, borderRadius: THEME.radius.lg, padding: '10px 14px', marginBottom: '12px', fontSize: THEME.fontSizes.sm, color: THEME.colors.error, fontFamily: THEME.fonts.ui }}>
          {items.filter(i => i.status !== 'RECEIVED' && daysUntil(i.expectedArrival) < 0).length} shipment(s) overdue — follow up with suppliers
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[{ l: 'All', v: '' }, { l: 'Ordered', v: 'ORDERED' }, { l: 'In transit', v: 'IN_TRANSIT' }, { l: 'Received', v: 'RECEIVED' }].map(f => (
          <FilterChip key={f.v} label={f.l} active={filter === f.v} onClick={() => setFilter(f.v)} />
        ))}
      </div>

      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={filtered} loading={loading} empty="No expected stock entries" rowKey={i => i.id} />
      </div>

      <Drawer open={showForm} onClose={() => { setShowForm(false); setErrors({}); }} title="Add expected stock">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="SKU" required helper="Exact variant SKU from the system" error={errors.sku} errorId="expected-sku-error">
            <TextInput
              value={form.sku}
              onChange={e => updateField('sku', e.target.value)}
              style={{ fontFamily: THEME.fonts.mono }}
              aria-invalid={!!errors.sku}
              aria-describedby={errors.sku ? 'expected-sku-error' : undefined}
            />
          </FormField>
          <FormField label="Product name">
            <TextInput value={form.productName} onChange={e => updateField('productName', e.target.value)} placeholder="For display only" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Size"><TextInput value={form.size} onChange={e => updateField('size', e.target.value)} placeholder="e.g. 2.5m" /></FormField>
            <FormField label="Colour"><TextInput value={form.colour} onChange={e => updateField('colour', e.target.value)} /></FormField>
          </div>
          <FormField label="Supplier name">
            <TextInput value={form.supplierName} onChange={e => updateField('supplierName', e.target.value)} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Qty expected" required error={errors.qtyExpected} errorId="expected-qty-error">
              <TextInput
                type="number"
                value={form.qtyExpected}
                onChange={e => updateField('qtyExpected', e.target.value)}
                onBlur={() => validateQtyExpected(form.qtyExpected)}
                aria-invalid={!!errors.qtyExpected}
                aria-describedby={errors.qtyExpected ? 'expected-qty-error' : undefined}
              />
            </FormField>
            <FormField label="Expected arrival" required error={errors.expectedArrival} errorId="expected-arrival-error">
              <TextInput
                type="date"
                value={form.expectedArrival}
                onChange={e => updateField('expectedArrival', e.target.value)}
                aria-invalid={!!errors.expectedArrival}
                aria-describedby={errors.expectedArrival ? 'expected-arrival-error' : undefined}
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={2} placeholder="Optional notes..." />
          </FormField>
          <ActionButton onClick={handleCreate} loading={saving} fullWidth>Add expected stock</ActionButton>
        </div>
      </Drawer>

      {ToastComponent}
    </div>
  );
}
