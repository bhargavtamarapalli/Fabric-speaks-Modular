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
  currentUser: { id: string } | null;
  currentUserRole: AdminRole;
  onDeactivate: (userId: string) => void;
}

export const UsersTable = memo(function UsersTable({ 
  users, 
  loading, 
  currentUser,
  currentUserRole,
  onDeactivate 
}: UsersTableProps) {
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      render: (u: AdminUser) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>
            {u.name || '--'}
          </div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
            {u.email || '--'}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      width: '160px',
      render: (u: AdminUser) => {
        const badge = BADGE_MAP[u.role] ?? 'support';
        const label = ROLE_LABELS[u.role] ?? 'Staff';
        return <Badge type={badge as any}>{label}</Badge>;
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
      render: (u: AdminUser) => {
        const isSelf = currentUser?.id === u.id;
        const canDeactivate = isSuperAdmin && !isSelf && u.isActive;

        return (
          <button
            onClick={e => {
              e.stopPropagation();
              onDeactivate(u.id);
            }}
            disabled={!canDeactivate}
            title={isSelf ? "You cannot deactivate yourself" : !isSuperAdmin ? "Only Super Admins can deactivate users" : !u.isActive ? "User is already inactive" : ""}
            style={{
              background: 'none',
              border: 'none',
              color: canDeactivate ? THEME.colors.error : THEME.colors.ghost,
              fontSize: THEME.fontSizes.sm,
              cursor: canDeactivate ? 'pointer' : 'not-allowed',
              fontFamily: THEME.fonts.ui,
              opacity: canDeactivate ? 1 : 0.5,
            }}
          >
            Deactivate
          </button>
        );
      },
    },
  ], [onDeactivate, isSuperAdmin, currentUser?.id]);

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
        renderEmpty={() => (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ color: THEME.colors.muted, marginBottom: '12px', fontFamily: THEME.fonts.ui }}>
              No admin users found.
            </div>
            {isSuperAdmin && (
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(201,169,110,0.1)',
                  color: THEME.colors.gold,
                  border: `1px dashed ${THEME.colors.gold}`,
                  padding: '8px 16px',
                  borderRadius: THEME.radius.md,
                  fontSize: THEME.fontSizes.sm,
                  fontFamily: THEME.fonts.ui,
                }}
              >
                Use the "+ Add user" button to invite team members
              </div>
            )}
          </div>
        )}
        rowKey={u => u.id}
      />
    </div>
  );
});
