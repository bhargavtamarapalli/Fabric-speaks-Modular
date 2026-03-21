'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import { Skeleton } from './Skeleton';

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height="150px" />
      <div style={{ padding: '12px' }}>
        <Skeleton width="60%" height="12px" />
        <Skeleton width="90%" height="16px" style={{ margin: '8px 0' }} />
        <Skeleton width="40%" height="12px" />
      </div>
    </div>
  );
});

export const ProductsGridSkeleton = memo(function ProductsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
});
