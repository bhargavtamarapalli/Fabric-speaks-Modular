'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Product } from '@/lib/admin/types';
import { 
  Drawer, FormField, TextInput, ActionButton, MonoText, ConfirmModal
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
  onAdjustVariantStock: (variantId: string, delta: number) => void;
  onBatchAdjustStock: (delta: number) => void;
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
  onAdjustVariantStock,
  onBatchAdjustStock,
}: BulkUpdateDrawerProps) {
  const [globalDelta, setGlobalDelta] = React.useState('');
  const [confirmSubtractOpen, setConfirmSubtractOpen] = React.useState(false);

  const handleBatchAdd = () => {
    const val = Number(globalDelta);
    if (!isNaN(val) && isFinite(val) && val !== 0) {
      onBatchAdjustStock(val);
      setGlobalDelta('');
    }
  };

  const handleBatchSubtractInit = () => {
    const val = Number(globalDelta);
    if (!isNaN(val) && isFinite(val) && val !== 0) {
      setConfirmSubtractOpen(true);
    }
  };

  const handleBatchSubtractConfirm = () => {
    onBatchAdjustStock(-Number(globalDelta));
    setGlobalDelta('');
    setConfirmSubtractOpen(false);
  };

  const btnStyle = {
    background: THEME.colors.surface2,
    border: `1px solid ${THEME.colors.border2}`,
    color: THEME.colors.linen,
    width: '24px',
    height: '24px',
    borderRadius: THEME.radius.sm,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    padding: 0,
  };
  return (
    <Drawer open={open} onClose={onClose} title="Bulk Update Variants">
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.md }}>
        
        {/* Global Adjustment Section */}
        <div style={{ 
          background: 'rgba(201,169,110,0.05)', 
          border: `1px dashed ${THEME.colors.linen}`, 
          borderRadius: THEME.radius.md, 
          padding: THEME.spacing.sm,
          marginBottom: THEME.spacing.sm
        }}>
          <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.linen, marginBottom: THEME.spacing.xs, textTransform: 'uppercase', fontWeight: 600 }}>Quick Batch Stock Adjustment</div>
          <div style={{ display: 'flex', gap: THEME.spacing.sm, alignItems: 'center' }}>
            <TextInput 
              placeholder="Enter amount (e.g. 5)" 
              value={globalDelta} 
              onChange={e => setGlobalDelta(e.target.value)}
              type="number"
            />
            <button 
              type="button"
              onClick={handleBatchAdd} 
              disabled={!globalDelta || isNaN(Number(globalDelta))}
              style={{ ...btnStyle, width: 'auto', padding: '0 12px', opacity: (!globalDelta || isNaN(Number(globalDelta))) ? 0.5 : 1 }}
              aria-label="Add entered amount to all variants stock"
            >
              Add to All
            </button>
            <button 
              type="button"
              onClick={handleBatchSubtractInit} 
              disabled={!globalDelta || isNaN(Number(globalDelta))}
              style={{ 
                ...btnStyle, 
                width: 'auto', 
                padding: '0 12px', 
                background: 'rgba(224,85,69,0.1)', 
                color: THEME.colors.error, 
                borderColor: 'rgba(224,85,69,0.3)',
                opacity: (!globalDelta || isNaN(Number(globalDelta))) ? 0.5 : 1
              }}
              aria-label="Subtract entered amount from all variants stock"
            >
              Subtract from All
            </button>
          </div>
        </div>

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
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button 
                      type="button"
                      style={btnStyle} 
                      onClick={() => onAdjustVariantStock(v.id, -1)}
                      aria-label={`Decrease stock for variant ${v.sku}`}
                    >
                      -
                    </button>
                    <TextInput
                      value={edit.stockQty}
                      onChange={e => onEditChange(v.id, { stockQty: e.target.value })}
                      style={{ textAlign: 'center' }}
                    />
                    <button 
                      type="button"
                      style={btnStyle} 
                      onClick={() => onAdjustVariantStock(v.id, 1)}
                      aria-label={`Increase stock for variant ${v.sku}`}
                    >
                      +
                    </button>
                  </div>
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

      <ConfirmModal
        open={confirmSubtractOpen}
        onCancel={() => setConfirmSubtractOpen(false)}
        title="Confirm Batch Adjustment"
        message={`Subtract ${globalDelta} from the current stock of ALL ${product.variants.length} variants? This action cannot be easily undone.`}
        confirmLabel="Confirm Subtraction"
        onConfirm={handleBatchSubtractConfirm}
        danger={true}
      />
    </Drawer>
  );
}
