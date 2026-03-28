'use client';
// app/admin/collections/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { collectionsApi } from '@/lib/admin/api';
import type { Collection } from '@/lib/admin/types';
import { PageHeader, Badge, DataTable, ActionButton, FilterChip, ErrorBanner, Drawer, FormField, TextInput, Textarea, useToast } from '@/components/admin/shared';
import { isServiceUnavailableError, mapError } from '@/lib/admin/errors';

export default function CollectionsPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [cols,     setCols]     = useState<Collection[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: '', description: '' });
  const [errors,   setErrors]   = useState<Partial<Record<'name', string>>>({});
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setCols(await collectionsApi.list()); }
    catch (e: any) { setError(isServiceUnavailableError(e) ? null : mapError(e)); }
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
    if (!form.name.trim()) next.name = 'Collection name is required';
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
      await collectionsApi.create({ name: form.name, slug: form.name.toLowerCase().replace(/\s+/g, '-'), description: form.description, imageUrl: null, isActive: false });
      showToast('Collection created', 'success');
      setShowForm(false);
      setForm({ name: '', description: '' });
      setErrors({});
      load();
    } catch (e: any) { showToast(mapError(e), 'error'); }
    finally { setSaving(false); }
  };

  const filtered = cols.filter(c => filter === 'all' || (filter === 'active' && c.isActive) || (filter === 'draft' && !c.isActive));

  const columns = [
    { key: 'name', label: 'Collection', render: (c: Collection) => (
      <div>
        <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{c.name}</div>
        <div 
          style={{ 
            color: THEME.colors.muted, 
            fontSize: THEME.fontSizes.xs, 
            fontFamily: THEME.fonts.ui, 
            marginTop: '1px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '300px',
          }} 
          title={c.description || undefined}
        >
          {c.description || '—'}
        </div>
      </div>
    )},
    { key: 'products', label: 'Products', width: '90px', render: (c: Collection) => <span style={{ color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{c.productCount}</span> },
    { key: 'status', label: 'Status', width: '90px', render: (c: Collection) => <Badge type={c.isActive ? 'active' : 'draft'}>{c.isActive ? 'Live' : 'Draft'}</Badge> },
    { key: 'edit', label: '', width: '60px', render: (c: Collection) => <button onClick={e => { e.stopPropagation(); router.push(`/admin/collections/${c.id}`); }} style={{ background: 'none', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.sm, cursor: 'pointer', fontFamily: THEME.fonts.ui }}>Edit</button> },
  ];

  return (
    <div>
      <PageHeader title="Collections" subtitle={`${cols.length} collections`} action={<ActionButton onClick={() => { setForm({ name: '', description: '' }); setErrors({}); setShowForm(true); }}>+ Create collection</ActionButton>} />
      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[{l:'All',v:'all'},{l:'Live',v:'active'},{l:'Draft',v:'draft'}].map(f => <FilterChip key={f.v} label={f.l} active={filter===f.v} onClick={()=>setFilter(f.v)} />)}
      </div>
      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={filtered} loading={loading} onRowClick={c => router.push(`/admin/collections/${c.id}`)} />
      </div>
      <Drawer open={showForm} onClose={() => { setShowForm(false); setErrors({}); }} title="Create collection">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Collection name" required error={errors.name} errorId="collection-name-error">
            <TextInput
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'collection-name-error' : undefined}
            />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={3} />
          </FormField>
          <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>Collection will be created as Draft. Add products then publish.</div>
          <ActionButton onClick={handleCreate} loading={saving} fullWidth>Create collection</ActionButton>
        </div>
      </Drawer>
      {ToastComponent}
    </div>
  );
}
