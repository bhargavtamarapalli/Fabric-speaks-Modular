'use client';

import React, { memo, useMemo } from 'react';
import { THEME } from '@/lib/admin/theme';
import type { CustomerSummary } from '@/lib/admin/types';
import { DataTable, MonoText, formatDateTime } from '@/components/admin/shared';

interface CustomersTableProps {
  customers: CustomerSummary[];
  loading: boolean;
  query: string;
}

export const CustomersTable = memo(function CustomersTable({ customers, loading, query }: CustomersTableProps) {
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      render: (u: CustomerSummary) => (
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
      key: 'mobile',
      label: 'Mobile',
      width: '140px',
      render: (u: CustomerSummary) => (
        <MonoText>{u.mobile || '--'}</MonoText>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      width: '140px',
      render: (u: CustomerSummary) => (
        <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
          {u.createdAt ? formatDateTime(u.createdAt) : '--'}
        </span>
      ),
    },
  ], []);

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
        data={customers}
        loading={loading}
        renderEmpty={() => (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ color: THEME.colors.muted, marginBottom: '12px', fontFamily: THEME.fonts.ui }}>
              {query.trim().length < 2 ? 'Type at least 2 characters to search customers.' : 'No customers found.'}
            </div>
          </div>
        )}
        rowKey={u => u.id}
      />
    </div>
  );
});
