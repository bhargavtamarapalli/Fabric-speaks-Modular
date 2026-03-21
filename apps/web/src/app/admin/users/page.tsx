'use client';

// app/admin/users/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { THEME } from '@/lib/admin/theme';
import { adminUsersApi } from '@/lib/admin/api';
import type { AdminUser, AdminRole } from '@/lib/admin/types';
import {
  PageHeader, Badge, DataTable, ActionButton, ErrorBanner,
  Drawer, FormField, TextInput, Select, ConfirmModal, useToast,
  formatDateTime,
} from '@/components/admin/shared';

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN:       'Super Admin',
  INVENTORY_MANAGER: 'Inventory Manager',
  SUPPORT_AGENT:     'Support Agent',
};

export default function UsersPage() {
  const { showToast, ToastComponent } = useToast();

  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: '', email: '', role: 'SUPPORT_AGENT' as AdminRole });
  const [errors,   setErrors]   = useState<Partial<Record<'name' | 'email' | 'role', string>>>({});
  const [saving,   setSaving]   = useState(false);
  const [deactId,  setDeactId]  = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setUsers(await adminUsersApi.list());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const validate = () => {
    const next: Partial<Record<'name' | 'email' | 'role', string>> = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email address is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
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
      await adminUsersApi.create({ ...form, isActive: true });
      showToast('User created — invite sent', 'success');
      setShowForm(false);
      setForm({ name: '', email: '', role: 'SUPPORT_AGENT' });
      setErrors({});
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactId) return;
    try {
      await adminUsersApi.deactivate(deactId);
      showToast('User deactivated', 'success');
      setDeactId(null);
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Failed', 'error');
    }
  };

  const columns = [
    {
      key:    'name',
      label:  'Name',
      render: (u: AdminUser) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>{u.name}</div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{u.email}</div>
        </div>
      ),
    },
    {
      key:    'role',
      label:  'Role',
      width:  '160px',
      render: (u: AdminUser) => {
        const badgeMap: Record<AdminRole, string> = { SUPER_ADMIN: 'superadmin', INVENTORY_MANAGER: 'inventory', SUPPORT_AGENT: 'support' };
        return <Badge type={badgeMap[u.role] as any}>{ROLE_LABELS[u.role]}</Badge>;
      },
    },
    {
      key:    'status',
      label:  'Status',
      width:  '90px',
      render: (u: AdminUser) => <Badge type={u.isActive ? 'active' : 'inactive'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key:    'last',
      label:  'Last active',
      width:  '130px',
      render: (u: AdminUser) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
          {u.lastActiveAt ? formatDateTime(u.lastActiveAt) : 'Never'}
        </span>
      ),
    },
    {
      key:    'actions',
      label:  '',
      width:  '100px',
      render: (u: AdminUser) => (
        <button
          onClick={e => { e.stopPropagation(); setDeactId(u.id); }}
          disabled={!u.isActive}
          style={{ background: 'none', border: 'none', color: u.isActive ? THEME.colors.error : THEME.colors.ghost, fontSize: THEME.fontSizes.sm, cursor: u.isActive ? 'pointer' : 'not-allowed', fontFamily: THEME.fonts.ui }}
        >
          Deactivate
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admin users"
        subtitle={`${users.length} members`}
        action={<ActionButton onClick={() => { setForm({ name: '', email: '', role: 'SUPPORT_AGENT' }); setErrors({}); setShowForm(true); }}>+ Add user</ActionButton>}
      />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
        <DataTable columns={columns} data={users} loading={loading} empty="No admin users" rowKey={u => u.id} />
      </div>

      <Drawer open={showForm} onClose={() => { setShowForm(false); setErrors({}); }} title="Add admin user">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Full name" required error={errors.name} errorId="admin-name-error">
            <TextInput
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'admin-name-error' : undefined}
            />
          </FormField>
          <FormField label="Email address" required error={errors.email} errorId="admin-email-error">
            <TextInput
              type="email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'admin-email-error' : undefined}
            />
          </FormField>
          <FormField label="Role" required>
            <Select value={form.role} onChange={e => updateField('role', e.target.value as AdminRole)}>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="INVENTORY_MANAGER">Inventory Manager</option>
              <option value="SUPPORT_AGENT">Support Agent</option>
            </Select>
          </FormField>
          <div style={{ background: 'rgba(201,169,110,0.06)', border: `1px solid rgba(201,169,110,0.12)`, borderRadius: THEME.radius.md, padding: '10px 12px', fontSize: THEME.fontSizes.sm, color: THEME.colors.linenDark, fontFamily: THEME.fonts.ui }}>
            An invite email will be sent to the address above.
          </div>
          <ActionButton onClick={handleCreate} loading={saving} fullWidth>Send invite</ActionButton>
        </div>
      </Drawer>

      <ConfirmModal open={!!deactId} title="Deactivate user?" message="This user will lose access immediately. Their audit log history is preserved." onConfirm={handleDeactivate} onCancel={() => setDeactId(null)} confirmLabel="Deactivate" danger />

      {ToastComponent}
    </div>
  );
}
