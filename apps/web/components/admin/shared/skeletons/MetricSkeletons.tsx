'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import { Skeleton } from './Skeleton';

export const MetricCardSkeleton = memo(function MetricCardSkeleton() {
  return (
    <div style={{
      background: THEME.colors.surface3,
      borderRadius: THEME.radius.lg,
      padding: '12px 14px',
      border: `1px solid ${THEME.colors.border}`,
    }}>
      <Skeleton width="40%" height="10px" />
      <Skeleton width="60%" height="22px" style={{ margin: '8px 0 6px' }} />
      <Skeleton width="50%" height="12px" />
    </div>
  );
});

export const MetricsGridSkeleton = memo(function MetricsGridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
});
