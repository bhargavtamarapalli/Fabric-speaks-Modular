'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import { Skeleton } from './Skeleton';

export const DataTableSkeleton = memo(function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${THEME.colors.border}`, display: 'flex', gap: '20px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="15%" height="10px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '14px', borderBottom: i < rows - 1 ? `1px solid ${THEME.colors.ghost}` : 'none', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Skeleton width="15%" />
          <Skeleton width="25%" />
          <Skeleton width="15%" />
          <Skeleton width="20%" />
          <Skeleton width="15%" />
        </div>
      ))}
    </div>
  );
});
