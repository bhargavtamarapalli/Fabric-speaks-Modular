'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Product } from '@/lib/admin/types';
import { SectionCard, ActionButton, MonoText, formatCurrency } from '@/components/admin/shared';
import { AddVariantModal } from './AddVariantModal';
import { useState } from 'react';

interface VariantListProps {
  product: Product;
  onBulkUpdate: () => void;
  onRefresh: () => void;
}

export function VariantList({ product, onBulkUpdate, onRefresh }: VariantListProps) {
  const [addVariantOpen, setAddVariantOpen] = useState(false);

  return (
    <SectionCard 
      title="Variants" 
      action={
        <div style={{ display: 'flex', gap: THEME.spacing.sm }}>
          <ActionButton variant="ghost" onClick={() => setAddVariantOpen(true)}>Add Variant</ActionButton>
          {product.variants.length > 0 && (
            <ActionButton onClick={onBulkUpdate}>Bulk Update Variants</ActionButton>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
        {product.variants.length === 0 ? (
          <div style={{ 
            padding: THEME.spacing.xl, 
            textAlign: 'center', 
            background: 'rgba(201,169,110,0.02)', 
            border: `1px dashed ${THEME.colors.border2}`,
            borderRadius: THEME.radius.md 
          }}>
            <div style={{ color: THEME.colors.ash, marginBottom: THEME.spacing.md }}>No variants yet for this product.</div>
            <ActionButton variant="ghost" onClick={() => setAddVariantOpen(true)}>Create First Variant</ActionButton>
          </div>
        ) : (
          product.variants.map(v => (
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
          ))
        )}
      </div>

      <AddVariantModal
        open={addVariantOpen}
        onClose={() => setAddVariantOpen(false)}
        product={product}
        onSuccess={() => {
          setAddVariantOpen(false);
          onRefresh();
        }}
      />
    </SectionCard>
  );
}
