'use client';

import React, { memo, useMemo } from 'react';
import { THEME } from '@/lib/admin/theme';
import type { AdminUser, AdminRole } from '@/lib/admin/types';
import { Badge, DataTable, formatDateTime } from '@/components/admin/shared';

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  INVENTORY_MANAGER: 'Inventory Manager',
  SUPPORT_AGENT: 'Support Agent',
};

const BADGE_MAP: Record<AdminRole, string> = {
  SUPER_ADMIN: 'superadmin',
  INVENTORY_MANAGER: 'inventory',
  SUPPORT_AGENT: 'support',
};

interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  onDeactivate: (userId: string) => void;
}

export const UsersTable = memo(function UsersTable({ users, loading, onDeactivate }: UsersTableProps) {
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      render: (u: AdminUser) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>
            {u.name}
          </div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
            {u.email}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      width: '160px',
      render: (u: AdminUser) => {
        return <Badge type={BADGE_MAP[u.role] as any}>{ROLE_LABELS[u.role]}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '90px',
      render: (u: AdminUser) => (
        <Badge type={u.isActive ? 'active' : 'inactive'}>
          {u.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'last',
      label: 'Last active',
      width: '130px',
      render: (u: AdminUser) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
          {u.lastActiveAt ? formatDateTime(u.lastActiveAt) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      render: (u: AdminUser) => (
        <button
          onClick={e => {
            e.stopPropagation();
            onDeactivate(u.id);
          }}
          disabled={!u.isActive}
          style={{
            background: 'none',
            border: 'none',
            color: u.isActive ? THEME.colors.error : THEME.colors.ghost,
            fontSize: THEME.fontSizes.sm,
            cursor: u.isActive ? 'pointer' : 'not-allowed',
            fontFamily: THEME.fonts.ui,
          }}
        >
          Deactivate
        </button>
      ),
    },
  ], [onDeactivate]);

  return (
    <div
      style={{
        background: THEME.colors.surface3,
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        overflow: 'hidden',
      }}
    >
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        empty="No admin users"
        rowKey={u => u.id}
      />
    </div>
  );
});
