'use client';

// app/admin/support/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME, css } from '@/lib/admin/theme';
import { supportApi } from '@/lib/admin/api';
import type { SupportCase, CustomerProfile } from '@/lib/admin/types';
import {
  PageHeader, Badge, DataTable, FilterChip, SearchInput,
  ActionButton, ErrorBanner, Loader, Drawer, FormField,
  TextInput, Timeline, MonoText, useToast,
  formatDateTime, formatCurrency, maskMobile,
} from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

export default function SupportPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [cases,    setCases]    = useState<SupportCase[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState('');
  const [search,   setSearch]   = useState('');

  // Customer lookup
  const [lookupMobile,  setLookupMobile]  = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customer,      setCustomer]      = useState<CustomerProfile | null>(null);
  const [showLookup,    setShowLookup]    = useState(false);
  const [newTag,        setNewTag]        = useState('');
  const [newNote,       setNewNote]       = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await supportApi.list({ status: filter || undefined });
      setCases(res);
    } catch (e: any) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleLookup = async () => {
    if (!lookupMobile.trim()) return;
    try {
      setLookupLoading(true);
      const res = await supportApi.lookupCustomer(lookupMobile.trim());
      setCustomer(res);
    } catch (e: any) {
      showToast(mapError(e), 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!customer || !newTag.trim()) return;
    try {
      await supportApi.addCustomerTag(customer.mobile, newTag.trim());
      setCustomer(prev => prev ? { ...prev, tags: [...prev.tags, newTag.trim()] } : prev);
      setNewTag('');
      showToast('Tag added', 'success');
    } catch (e: any) {
      showToast(mapError(e), 'error');
    }
  };

  const handleAddNote = async () => {
    if (!customer || !newNote.trim()) return;
    try {
      await supportApi.addCustomerNote(customer.mobile, newNote.trim());
      showToast('Note added', 'success');
      setNewNote('');
    } catch (e: any) {
      showToast(mapError(e), 'error');
    }
  };

  const filtered = cases.filter(c =>
    !search ||
    c.customer.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer.mobile.includes(search)
  );

  const columns = [
    {
      key:    'id',
      label:  'Case',
      width:  '90px',
      render: (c: SupportCase) => <MonoText>{c.id}</MonoText>,
    },
    {
      key:    'customer',
      label:  'Customer',
      render: (c: SupportCase) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>{c.customer.name}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{maskMobile(c.customer.mobile)}</div>
        </div>
      ),
    },
    {
      key:    'issue',
      label:  'Issue',
      render: (c: SupportCase) => (
        <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>{c.issueType}</span>
      ),
    },
    {
      key:    'order',
      label:  'Order',
      width:  '110px',
      render: (c: SupportCase) => c.orderNumber
        ? <span style={{ fontFamily: THEME.fonts.mono, fontSize: THEME.fontSizes.sm, color: THEME.colors.linen }}>{c.orderNumber}</span>
        : <span style={{ color: THEME.colors.muted }}>—</span>,
    },
    {
      key:    'priority',
      label:  'Priority',
      width:  '90px',
      render: (c: SupportCase) => (
        <Badge type={c.priority.toLowerCase() as any}>{c.priority}</Badge>
      ),
    },
    {
      key:    'status',
      label:  'Status',
      width:  '110px',
      render: (c: SupportCase) => (
        <Badge type={c.status.toLowerCase().replace('_','') as any}>{c.status.replace('_', ' ')}</Badge>
      ),
    },
    {
      key:    'agent',
      label:  'Agent',
      width:  '110px',
      render: (c: SupportCase) => (
        <span style={{ color: c.assignedTo ? THEME.colors.ash : THEME.colors.muted, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>
          {c.assignedTo ?? 'Unassigned'}
        </span>
      ),
    },
    {
      key:    'time',
      label:  'Opened',
      width:  '120px',
      render: (c: SupportCase) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
          {formatDateTime(c.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle={`${cases.filter(c => c.status === 'OPEN').length} open cases`}
        action={
          <ActionButton onClick={() => { setCustomer(null); setLookupMobile(''); setShowLookup(true); }}>
            Customer lookup
          </ActionButton>
        }
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map((v, i) => (
          <FilterChip key={v} label={['All','Open','In progress','Resolved','Escalated'][i]} active={filter === v} onClick={() => setFilter(v)} />
        ))}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Search by name or mobile..." value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          empty="No support cases"
          onRowClick={c => router.push(`/admin/support/${c.id}`)}
          rowKey={c => c.id}
        />
      </div>

      {/* Customer Lookup Drawer */}
      <Drawer open={showLookup} onClose={() => setShowLookup(false)} title="Customer lookup" width="520px">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <TextInput
            placeholder="Enter mobile number (e.g. 9876543210)"
            value={lookupMobile}
            onChange={e => setLookupMobile(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            style={{ flex: 1 }}
          />
          <ActionButton onClick={handleLookup} loading={lookupLoading}>Search</ActionButton>
        </div>

        {customer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Profile card */}
            <div style={{ background: THEME.colors.bg, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(201,169,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.colors.linen, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.base, fontWeight: 600, flexShrink: 0 }}>
                  {customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <div>
                  <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.md, fontFamily: THEME.fonts.ui }}>{customer.name}</div>
                  <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{maskMobile(customer.mobile)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Member since', value: new Date(customer.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
                  { label: 'Total orders', value: customer.totalOrders },
                  { label: 'Total spent',  value: formatCurrency(customer.totalSpent) },
                  { label: 'Returns',      value: customer.returns.length },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{row.label}</div>
                    <div style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, marginTop: '1px' }}>{String(row.value)}</div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div style={{ marginTop: '10px', borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: '10px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                  {customer.tags.map(tag => (
                    <span key={tag} style={{ background: 'rgba(201,169,110,0.08)', color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, padding: '2px 8px', borderRadius: THEME.radius.pill, fontFamily: THEME.fonts.ui }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <TextInput placeholder="Add tag..." value={newTag} onChange={e => setNewTag(e.target.value)} />
                  <ActionButton onClick={handleAddTag} variant="ghost">Add</ActionButton>
                </div>
              </div>
            </div>

            {/* Order history */}
            <div style={{ background: THEME.colors.bg, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${THEME.colors.ghost}` }}>
                <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.linen, fontFamily: THEME.fonts.ui, fontWeight: 500 }}>Order history</span>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {customer.orders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: `1px solid ${THEME.colors.ghost}`, cursor: 'pointer' }}
                  >
                    <div>
                      <MonoText>{o.orderNumber}</MonoText>
                      <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.mono, marginTop: '1px' }}>{formatDateTime(o.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>{formatCurrency(o.total)}</div>
                      <Badge type={(o.status.toLowerCase().split('_')[0]) as any}>{o.status.replace(/_/g,' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp message log */}
            {customer.messages.length > 0 && (
              <div style={{ background: THEME.colors.bg, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${THEME.colors.ghost}` }}>
                  <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.linen, fontFamily: THEME.fonts.ui, fontWeight: 500 }}>WhatsApp messages sent</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {customer.messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{m.templateName}</span>
                      <span style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.mono }}>{formatDateTime(m.sentAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>Internal note</div>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note about this customer (not visible to customer)..."
                rows={3}
                style={{ background: THEME.colors.bg, border: `1px solid ${THEME.colors.border2}`, borderRadius: THEME.radius.md, color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui, padding: '8px 10px', resize: 'vertical', outline: 'none', width: '100%' }}
              />
              <ActionButton onClick={handleAddNote} disabled={!newNote.trim()} variant="ghost">Add note</ActionButton>
            </div>
          </div>
        )}
      </Drawer>

      {ToastComponent}
    </div>
  );
}
