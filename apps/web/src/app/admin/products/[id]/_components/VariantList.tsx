'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Product } from '@/lib/admin/types';
import { SectionCard, ActionButton, MonoText, formatCurrency } from '@/components/admin/shared';

interface VariantListProps {
  product: Product;
  onBulkUpdate: () => void;
}

export function VariantList({ product, onBulkUpdate }: VariantListProps) {
  return (
    <SectionCard 
      title="Variants" 
      action={<ActionButton onClick={onBulkUpdate}>Bulk Update Variants</ActionButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
        {product.variants.map(v => (
          <div 
            key={v.id} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              gap: THEME.spacing.md, 
              borderBottom: `1px solid ${THEME.colors.border}`, 
              paddingBottom: THEME.spacing.sm 
            }}
          >
            <div>
              <div style={{ color: THEME.colors.ivory }}>{v.colour} · {v.size}</div>
              <MonoText color={THEME.colors.muted}>{v.sku}</MonoText>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: THEME.colors.ivory }}>{formatCurrency(v.price)}</div>
              <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs }}>{v.stockQty} in stock</div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
