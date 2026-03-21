'use client';
// app/admin/pages/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { THEME } from '@/lib/admin/theme';
import { contentApi } from '@/lib/admin/api';
import type { ContentPage } from '@/lib/admin/types';
import {
  PageHeader, Badge, DataTable, ActionButton, ErrorBanner,
  Drawer, FormField, TextInput, Textarea, Toggle, useToast,
  formatDateTime,
} from '@/components/admin/shared';

export default function ContentPagesAdminPage() {
  const { showToast, ToastComponent } = useToast();

  const [pages,    setPages]    = useState<ContentPage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [editing,  setEditing]  = useState<ContentPage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ title: '', slug: '', body: '', metaTitle: '', metaDesc: '', publishedAt: null as string | null });
  const [errors,   setErrors]   = useState<Partial<Record<'title' | 'slug' | 'body', string>>>({});
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setPages(await contentApi.list());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    if (key === 'title') {
      setErrors(prev => (prev.title ? { ...prev, title: '' } : prev));
    } else if (key === 'slug') {
      setErrors(prev => (prev.slug ? { ...prev, slug: '' } : prev));
    } else if (key === 'body') {
      setErrors(prev => (prev.body ? { ...prev, body: '' } : prev));
    }
  };

  const validate = () => {
    const next: Partial<Record<'title' | 'slug' | 'body', string>> = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.slug.trim()) next.slug = 'URL slug is required';
    if (!form.body.trim()) next.body = 'Page body is required';
    return next;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', slug: '', body: '', metaTitle: '', metaDesc: '', publishedAt: null });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (page: ContentPage) => {
    setEditing(page);
    setForm({ title: page.title, slug: page.slug, body: page.body, metaTitle: page.metaTitle, metaDesc: page.metaDesc, publishedAt: page.publishedAt });
    setErrors({});
    setShowForm(true);
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await contentApi.update(editing.id, { ...form });
      } else {
        await contentApi.create({ ...form });
      }
      showToast(editing ? 'Page updated' : 'Page created', 'success');
      setShowForm(false);
      setErrors({});
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (page: ContentPage) => {
    try {
      if (page.publishedAt) {
        await contentApi.unpublish(page.id);
        showToast('Page unpublished', 'success');
      } else {
        await contentApi.publish(page.id);
        showToast('Page published', 'success');
      }
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Failed', 'error');
    }
  };

  const autoSlug = (title: string) => title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const columns = [
    {
      key: 'title', label: 'Page',
      render: (p: ContentPage) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{p.title}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>/pages/{p.slug}</div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status', width: '110px',
      render: (p: ContentPage) => <Badge type={p.publishedAt ? 'active' : 'draft'}>{p.publishedAt ? 'Published' : 'Draft'}</Badge>,
    },
    {
      key: 'updated', label: 'Last updated', width: '130px',
      render: (p: ContentPage) => <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{formatDateTime(p.updatedAt)}</span>,
    },
    {
      key: 'publish', label: '', width: '100px',
      render: (p: ContentPage) => (
        <button
          onClick={e => { e.stopPropagation(); handleTogglePublish(p); }}
          style={{ background: 'none', border: 'none', color: p.publishedAt ? THEME.colors.error : THEME.colors.success, fontSize: THEME.fontSizes.sm, cursor: 'pointer', fontFamily: THEME.fonts.ui }}
        >
          {p.publishedAt ? 'Unpublish' : 'Publish'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Content pages"
        subtitle="About, Returns policy, Size guide, Privacy policy etc."
        action={<ActionButton onClick={openCreate}>+ New page</ActionButton>}
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={pages} loading={loading} empty="No pages created yet" onRowClick={openEdit} rowKey={p => p.id} />
      </div>

      <Drawer open={showForm} onClose={() => { setShowForm(false); setErrors({}); }} title={editing ? `Edit — ${editing.title}` : 'New page'} width="560px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Title" required error={errors.title} errorId="page-title-error">
            <TextInput
              value={form.title}
              onChange={e => {
                const title = e.target.value;
                updateField('title', title);
                if (!form.slug) updateField('slug', autoSlug(title));
              }}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'page-title-error' : undefined}
            />
          </FormField>

          <FormField label="URL slug" required helper={`Will be available at /pages/${form.slug}`} error={errors.slug} errorId="page-slug-error">
            <TextInput
              value={form.slug}
              onChange={e => updateField('slug', autoSlug(e.target.value))}
              style={{ fontFamily: THEME.fonts.mono }}
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? 'page-slug-error' : undefined}
            />
          </FormField>

          <FormField label="Page body" required helper="Supports basic HTML" error={errors.body} errorId="page-body-error">
            <Textarea
              value={form.body}
              onChange={e => updateField('body', e.target.value)}
              rows={10}
              style={{ fontFamily: THEME.fonts.mono, fontSize: THEME.fontSizes.sm }}
              aria-invalid={!!errors.body}
              aria-describedby={errors.body ? 'page-body-error' : undefined}
            />
          </FormField>

          <div style={{ borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: '12px' }}>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: THEME.fonts.ui, marginBottom: '10px' }}>SEO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <FormField label="Meta title">
                <TextInput value={form.metaTitle} onChange={e => updateField('metaTitle', e.target.value)} />
              </FormField>
              <FormField label="Meta description">
                <Textarea value={form.metaDesc} onChange={e => updateField('metaDesc', e.target.value)} rows={2} />
              </FormField>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <ActionButton onClick={handleSave} loading={saving} fullWidth>Save page</ActionButton>
          </div>
        </div>
      </Drawer>

      {ToastComponent}
    </div>
  );
}
