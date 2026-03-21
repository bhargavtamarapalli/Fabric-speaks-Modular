'use client';

// app/admin/coupons/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { THEME } from '@/lib/admin/theme';
import { couponsApi } from '@/lib/admin/api';
import type { Coupon, DiscountType } from '@/lib/admin/types';
import {
  PageHeader, Badge, DataTable, FilterChip, SearchInput,
  ActionButton, ErrorBanner, Drawer, FormField, TextInput,
  Select, MonoText, ConfirmModal, useToast,
  formatCurrency, formatDate,
} from '@/components/admin/shared';

interface CouponForm {
  code:          string;
  discountType:  DiscountType;
  discountValue: string;
  minOrderValue: string;
  usageLimit:    string;
  perUserLimit:  string;
  expiresAt:     string;
  isActive:      boolean;
}

const EMPTY_FORM: CouponForm = {
  code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '0',
  usageLimit: '100', perUserLimit: '1', expiresAt: '', isActive: true,
};

export default function CouponsPage() {
  const { showToast, ToastComponent } = useToast();

  const [coupons,  setCoupons]  = useState<Coupon[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState<CouponForm>(EMPTY_FORM);
  const [errors,   setErrors]   = useState<Partial<Record<keyof CouponForm, string>>>({});
  const [saving,   setSaving]   = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await couponsApi.list();
      setCoupons(res);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const validate = (values: CouponForm) => {
    const next: Partial<Record<keyof CouponForm, string>> = {};
    const discountLabel = values.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount';
    const discountValue = Number(values.discountValue);
    if (!values.code.trim()) next.code = 'Coupon code is required';
    if (!values.discountValue.trim()) next.discountValue = `${discountLabel} is required`;
    if (values.discountValue && (Number.isNaN(discountValue) || discountValue <= 0)) next.discountValue = `${discountLabel} must be a positive number`;
    if (values.minOrderValue && (Number.isNaN(Number(values.minOrderValue)) || Number(values.minOrderValue) < 0)) next.minOrderValue = 'Minimum order value must be a positive number';
    if (values.usageLimit && (Number.isNaN(Number(values.usageLimit)) || parseInt(values.usageLimit, 10) <= 0)) next.usageLimit = 'Total usage limit must be a positive number';
    if (values.perUserLimit && (Number.isNaN(Number(values.perUserLimit)) || parseInt(values.perUserLimit, 10) <= 0)) next.perUserLimit = 'Per user limit must be a positive number';
    if (!values.expiresAt) next.expiresAt = 'Expiry date is required';
    return next;
  };

  const filtered = coupons.filter(c => {
    const matchSearch = !search || c.code.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'active' && c.isActive) || (filter === 'inactive' && !c.isActive) || (filter === 'expired' && new Date(c.expiresAt) < new Date());
    return matchSearch && matchFilter;
  });

  const handleCreate = async () => {
    const validationErrors = validate(form);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }
    try {
      setSaving(true);
      await couponsApi.create({
        code:          form.code.toUpperCase(),
        discountType:  form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        usageLimit:    parseInt(form.usageLimit, 10) || 100,
        perUserLimit:  parseInt(form.perUserLimit, 10) || 1,
        expiresAt:     new Date(form.expiresAt).toISOString(),
        isActive:      true,
      });
      showToast('Coupon created', 'success');
      setShowForm(false);
      setForm(EMPTY_FORM);
      setErrors({});
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await couponsApi.deactivate(deactivateId);
      showToast('Coupon deactivated', 'success');
      setDeactivateId(null);
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Failed', 'error');
    }
  };

  const previewSavings = () => {
    const v = parseFloat(form.discountValue);
    if (!v) return null;
    if (form.discountType === 'PERCENTAGE') return `Customer saves ${v}% off their order`;
    return `Customer saves ₹${v} off their order`;
  };

  const columns = [
    {
      key:    'code',
      label:  'Code',
      width:  '130px',
      render: (c: Coupon) => (
        <MonoText color={THEME.colors.ivory}>{c.code}</MonoText>
      ),
    },
    {
      key:    'type',
      label:  'Type',
      width:  '110px',
      render: (c: Coupon) => (
        <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>
          {c.discountType === 'PERCENTAGE' ? 'Percentage' : 'Flat amount'}
        </span>
      ),
    },
    {
      key:    'discount',
      label:  'Discount',
      width:  '100px',
      render: (c: Coupon) => (
        <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 600 }}>
          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
        </span>
      ),
    },
    {
      key:    'minOrder',
      label:  'Min order',
      width:  '100px',
      render: (c: Coupon) => (
        <span style={{ color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>
          {c.minOrderValue ? formatCurrency(c.minOrderValue) : '—'}
        </span>
      ),
    },
    {
      key:    'usage',
      label:  'Usage',
      width:  '120px',
      render: (c: Coupon) => {
        const pct = Math.round((c.usedCount / c.usageLimit) * 100);
        return (
          <div>
            <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui, marginBottom: '4px' }}>{c.usedCount}/{c.usageLimit}</div>
            <div style={{ height: '3px', background: THEME.colors.ghost, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: THEME.colors.linen, borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
          </div>
        );
      },
    },
    {
      key:    'expiry',
      label:  'Expiry',
      width:  '110px',
      render: (c: Coupon) => {
        const expired = new Date(c.expiresAt) < new Date();
        return (
          <span style={{ color: expired ? THEME.colors.error : THEME.colors.ash, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>
            {formatDate(c.expiresAt)}
          </span>
        );
      },
    },
    {
      key:    'status',
      label:  'Status',
      width:  '90px',
      render: (c: Coupon) => (
        <Badge type={c.isActive ? 'active' : 'inactive'}>
          {c.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key:    'actions',
      label:  '',
      width:  '100px',
      render: (c: Coupon) => (
        <button
          onClick={e => { e.stopPropagation(); setDeactivateId(c.id); }}
          disabled={!c.isActive}
          style={{ background: 'none', border: 'none', color: c.isActive ? THEME.colors.error : THEME.colors.ghost, fontSize: THEME.fontSizes.sm, cursor: c.isActive ? 'pointer' : 'not-allowed', fontFamily: THEME.fonts.ui }}
        >
          Deactivate
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle={`${coupons.filter(c => c.isActive).length} active coupons`}
        action={<ActionButton onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowForm(true); }}>+ Create coupon</ActionButton>}
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[{ l: 'All', v: 'all' }, { l: 'Active', v: 'active' }, { l: 'Inactive', v: 'inactive' }, { l: 'Expired', v: 'expired' }].map(f => (
          <FilterChip key={f.v} label={f.l} active={filter === f.v} onClick={() => setFilter(f.v)} />
        ))}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Search coupon code..." value={search} onChange={setSearch} />
        </div>
      </div>

      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={filtered} loading={loading} />
      </div>

      {/* Create coupon drawer */}
      <Drawer open={showForm} onClose={() => { setShowForm(false); setErrors({}); }} title="Create coupon">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Coupon code" required helper="Auto-uppercased" error={errors.code} errorId="coupon-code-error">
            <TextInput
              value={form.code}
              onChange={e => updateField('code', e.target.value.toUpperCase())}
              placeholder="e.g. FABRICFIRST"
              style={{ fontFamily: THEME.fonts.mono, letterSpacing: '0.05em' }}
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? 'coupon-code-error' : undefined}
            />
          </FormField>

          <FormField label="Discount type" required>
            <Select value={form.discountType} onChange={e => updateField('discountType', e.target.value as DiscountType)}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT">Flat amount</option>
            </Select>
          </FormField>

          <FormField label={form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount'} required error={errors.discountValue} errorId="coupon-discount-error">
            <TextInput
              type="number"
              min="0"
              prefix={form.discountType === 'FLAT' ? '₹' : undefined}
              suffix={form.discountType === 'PERCENTAGE' ? '%' : undefined}
              value={form.discountValue}
              onChange={e => updateField('discountValue', e.target.value)}
              aria-invalid={!!errors.discountValue}
              aria-describedby={errors.discountValue ? 'coupon-discount-error' : undefined}
            />
            {previewSavings() && (
              <div style={{ marginTop: '4px', fontSize: THEME.fontSizes.xs, color: THEME.colors.success, fontFamily: THEME.fonts.ui }}>
                {previewSavings()}
              </div>
            )}
          </FormField>

          <FormField label="Minimum order value" helper="Leave 0 for no minimum" error={errors.minOrderValue} errorId="coupon-min-order-error">
            <TextInput
              type="number"
              min="0"
              prefix="₹"
              value={form.minOrderValue}
              onChange={e => updateField('minOrderValue', e.target.value)}
              aria-invalid={!!errors.minOrderValue}
              aria-describedby={errors.minOrderValue ? 'coupon-min-order-error' : undefined}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Total usage limit" error={errors.usageLimit} errorId="coupon-usage-error">
              <TextInput
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={e => updateField('usageLimit', e.target.value)}
                aria-invalid={!!errors.usageLimit}
                aria-describedby={errors.usageLimit ? 'coupon-usage-error' : undefined}
              />
            </FormField>
            <FormField label="Per user limit" error={errors.perUserLimit} errorId="coupon-per-user-error">
              <TextInput
                type="number"
                min="1"
                value={form.perUserLimit}
                onChange={e => updateField('perUserLimit', e.target.value)}
                aria-invalid={!!errors.perUserLimit}
                aria-describedby={errors.perUserLimit ? 'coupon-per-user-error' : undefined}
              />
            </FormField>
          </div>

          <FormField label="Expiry date" required error={errors.expiresAt} errorId="coupon-expiry-error">
            <TextInput
              type="date"
              value={form.expiresAt}
              onChange={e => updateField('expiresAt', e.target.value)}
              aria-invalid={!!errors.expiresAt}
              aria-describedby={errors.expiresAt ? 'coupon-expiry-error' : undefined}
            />
          </FormField>

          <div style={{ borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: '14px' }}>
            <ActionButton onClick={handleCreate} loading={saving} fullWidth>Create coupon</ActionButton>
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        open={!!deactivateId}
        title="Deactivate coupon?"
        message="This coupon will stop working immediately. Customers who already applied it to their cart will lose the discount."
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateId(null)}
        confirmLabel="Deactivate"
        danger
      />

      {ToastComponent}
    </div>
  );
}
