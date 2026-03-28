'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import type { AdminRole } from '@/lib/admin/types';
import {
  Drawer,
  FormField,
  TextInput,
  Select,
  ActionButton,
} from '@/components/admin/shared';

interface UsersFormDrawerProps {
  open: boolean;
  form: { name: string; email: string; mobile: string; role: AdminRole };
  errors: Partial<Record<'name' | 'email' | 'mobile' | 'role', string>>;
  saving: boolean;
  onClose: () => void;
  onUpdateField: <K extends 'name' | 'email' | 'mobile' | 'role'>(key: K, value: any) => void;
  onSubmit: () => void;
}

export const UsersFormDrawer = memo(function UsersFormDrawer({
  open,
  form,
  errors,
  saving,
  onClose,
  onUpdateField,
  onSubmit,
}: UsersFormDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Add admin user">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <FormField label="Full name" required error={errors.name} errorId="admin-name-error">
          <TextInput
            value={form.name}
            onChange={e => onUpdateField('name', e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'admin-name-error' : undefined}
          />
        </FormField>
        <FormField label="Email address" required error={errors.email} errorId="admin-email-error">
          <TextInput
            type="email"
            value={form.email}
            onChange={e => onUpdateField('email', e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'admin-email-error' : undefined}
          />
        </FormField>
        <FormField label="Mobile number" required error={errors.mobile} errorId="admin-mobile-error">
          <TextInput
            value={form.mobile}
            onChange={e => onUpdateField('mobile', e.target.value)}
            aria-invalid={!!errors.mobile}
            aria-describedby={errors.mobile ? 'admin-mobile-error' : undefined}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            maxLength={10}
          />
        </FormField>
        <FormField label="Role" required>
          <Select
            value={form.role}
            onChange={e => onUpdateField('role', e.target.value as AdminRole)}
          >
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="INVENTORY_MANAGER">Inventory Manager</option>
            <option value="SUPPORT_AGENT">Support Agent</option>
          </Select>
        </FormField>
        <div
          style={{
            background: 'rgba(201,169,110,0.06)',
            border: `1px solid rgba(201,169,110,0.12)`,
            borderRadius: THEME.radius.md,
            padding: '10px 12px',
            fontSize: THEME.fontSizes.sm,
            color: THEME.colors.linenDark,
            fontFamily: THEME.fonts.ui,
          }}
        >
          An invite email will be sent to the address above.
        </div>
        <ActionButton onClick={onSubmit} loading={saving} fullWidth>
          Send invite
        </ActionButton>
      </div>
    </Drawer>
  );
});
