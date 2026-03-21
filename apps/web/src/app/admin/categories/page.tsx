'use client';
// app/admin/categories/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { THEME } from '@/lib/admin/theme';
import { categoriesApi } from '@/lib/admin/api';
import type { Category } from '@/lib/admin/types';
import { PageHeader, Badge, DataTable, ActionButton, ErrorBanner, Drawer, FormField, TextInput, Select, ConfirmModal, useToast } from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

export default function CategoriesPage() {
  const { showToast, ToastComponent } = useToast();
  const [cats,     setCats]     = useState<Category[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: '', parentId: '' });
  const [errors,   setErrors]   = useState<Partial<Record<'name', string>>>({});
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setCats(await categoriesApi.list()); }
    catch (e: any) { setError(mapError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    if (key === 'name') {
      setErrors(prev => (prev.name ? { ...prev, name: '' } : prev));
    }
  };

  const validate = () => {
    const next: Partial<Record<'name', string>> = {};
    if (!form.name.trim()) next.name = 'Category name is required';
    return next;
  };

  const handleCreate = async () => {
    const validationErrors = validate();
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }
    try {
      setSaving(true);
      await categoriesApi.create({ name: form.name, slug: form.name.toLowerCase().replace(/\s+/g, '-'), parentId: form.parentId || null, isActive: true });
      showToast('Category created', 'success');
      setShowForm(false);
      setForm({ name: '', parentId: '' });
      setErrors({});
      load();
    } catch (e: any) { showToast(mapError(e), 'error'); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (c: Category) => <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{c.name}</span> },
    { key: 'parent', label: 'Parent', render: (c: Category) => <span style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{cats.find(x => x.id === c.parentId)?.name ?? '—'}</span> },
    { key: 'slug', label: 'Slug', render: (c: Category) => <span style={{ fontFamily: THEME.fonts.mono, fontSize: THEME.fontSizes.sm, color: THEME.colors.ash }}>{c.slug}</span> },
    { key: 'status', label: 'Status', width: '90px', render: (c: Category) => <Badge type={c.isActive ? 'active' : 'inactive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'edit', label: '', width: '60px', render: (c: Category) => <button onClick={e => e.stopPropagation()} style={{ background: 'none', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.sm, cursor: 'pointer', fontFamily: THEME.fonts.ui }}>Edit</button> },
  ];

  return (
    <div>
      <PageHeader title="Categories" subtitle={`${cats.length} categories`} action={<ActionButton onClick={() => { setForm({ name: '', parentId: '' }); setErrors({}); setShowForm(true); }}>+ Add category</ActionButton>} />
      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}
      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={cats} loading={loading} />
      </div>
      <Drawer open={showForm} onClose={() => { setShowForm(false); setErrors({}); }} title="Add category">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Category name" required error={errors.name} errorId="category-name-error">
            <TextInput
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'category-name-error' : undefined}
            />
          </FormField>
          <FormField label="Parent category" helper="Leave blank for top-level">
            <Select value={form.parentId} onChange={e => updateField('parentId', e.target.value)}>
              <option value="">None (top-level)</option>
              {cats.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <ActionButton onClick={handleCreate} loading={saving} fullWidth>Create category</ActionButton>
        </div>
      </Drawer>
      {ToastComponent}
    </div>
  );
}
