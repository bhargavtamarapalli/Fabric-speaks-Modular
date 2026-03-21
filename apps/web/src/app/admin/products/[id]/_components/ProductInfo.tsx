'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Product } from '@/lib/admin/types';
import { SectionCard } from '@/components/admin/shared';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  return (
    <SectionCard title="Details">
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Brand</span>
          <span style={{ color: THEME.colors.ivory }}>{product.brandName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Category</span>
          <span style={{ color: THEME.colors.ivory }}>{product.categoryName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Fabric</span>
          <span style={{ color: THEME.colors.ivory }}>{product.fabricType}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Weave</span>
          <span style={{ color: THEME.colors.ivory }}>{product.weaveType}</span>
        </div>
      </div>
    </SectionCard>
  );
}
