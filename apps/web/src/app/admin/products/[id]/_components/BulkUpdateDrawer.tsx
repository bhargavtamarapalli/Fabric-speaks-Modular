'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Product } from '@/lib/admin/types';
import { 
  Drawer, FormField, TextInput, ActionButton, MonoText 
} from '@/components/admin/shared';
import type { VariantEdit, VariantErrors } from '../_hooks/useProductDetail';

interface BulkUpdateDrawerProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  edits: VariantEdit[];
  onEditChange: (variantId: string, patch: Partial<VariantEdit>) => void;
  errors: Record<string, VariantErrors>;
  onSave: () => void;
  saving: boolean;
}

export function BulkUpdateDrawer({
  open,
  onClose,
  product,
  edits,
  onEditChange,
  errors,
  onSave,
  saving,
}: BulkUpdateDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Bulk Update Variants">
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.md }}>
        {product.variants.map(v => {
          const edit = edits.find(e => e.variantId === v.id);
          const err = errors[v.id] ?? {};
          if (!edit) return null;
          return (
            <div key={v.id} style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.md, padding: THEME.spacing.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: THEME.spacing.sm }}>
                <div>
                  <div style={{ color: THEME.colors.ivory }}>{v.colour} · {v.size}</div>
                  <MonoText color={THEME.colors.muted}>{v.sku}</MonoText>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: THEME.spacing.sm }}>
                <FormField label="Price" required error={err.price}>
                  <TextInput
                    value={edit.price}
                    onChange={e => onEditChange(v.id, { price: e.target.value })}
                  />
                </FormField>
                <FormField label="Compare Price" error={err.comparePrice}>
                  <TextInput
                    value={edit.comparePrice}
                    onChange={e => onEditChange(v.id, { comparePrice: e.target.value })}
                  />
                </FormField>
                <FormField label="Stock Qty" required error={err.stockQty}>
                  <TextInput
                    value={edit.stockQty}
                    onChange={e => onEditChange(v.id, { stockQty: e.target.value })}
                  />
                </FormField>
                <FormField label="Colour Image URL" error={err.colourImageUrl}>
                  <TextInput
                    value={edit.colourImageUrl}
                    onChange={e => onEditChange(v.id, { colourImageUrl: e.target.value })}
                    placeholder="https://"
                  />
                </FormField>
              </div>
            </div>
          );
        })}
        <ActionButton onClick={onSave} loading={saving}>Save Updates</ActionButton>
      </div>
    </Drawer>
  );
}
