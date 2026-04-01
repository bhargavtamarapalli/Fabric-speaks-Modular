'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import type { InventoryItem } from '@/lib/admin/types';
import {
  Drawer,
  FormField,
  TextInput,
  Select,
  ActionButton,
  MonoText,
} from '@/components/admin/shared';
import { ADJUSTMENT_REASON_OPTIONS, type AdjustmentReason } from '../_utils/inventoryHelpers';

interface InventoryAdjustDrawerProps {
  open: boolean;
  item: InventoryItem | null;
  adjType: 'add' | 'remove' | 'set';
  adjQty: string;
  adjReason: AdjustmentReason;
  adjErrors: { qty?: string; reason?: string };
  adjLoading: boolean;
  newTotal: () => number;
  onClose: () => void;
  onTypeChange: (type: 'add' | 'remove' | 'set') => void;
  onQtyChange: (qty: string) => void;
  onReasonChange: (reason: AdjustmentReason) => void;
  onPresetReason: (reason: AdjustmentReason) => void;
  onSubmit: () => void;
}

export const InventoryAdjustDrawer = memo(function InventoryAdjustDrawer({
  open,
  item,
  adjType,
  adjQty,
  adjReason,
  adjErrors,
  adjLoading,
  newTotal,
  onClose,
  onTypeChange,
  onQtyChange,
  onReasonChange,
  onPresetReason,
  onSubmit,
}: InventoryAdjustDrawerProps) {
  if (!item) return null;

  return (
    <Drawer open={open} onClose={onClose} title={`Adjust stock — ${item.productName}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Current Stock */}
        <div style={{ padding: '10px 12px', background: 'rgba(201,169,110,0.04)', borderRadius: THEME.radius.md, border: `1px solid rgba(201,169,110,0.12)` }}>
          <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginBottom: '4px' }}>
            Current stock
          </div>
          <div style={{ fontSize: THEME.fontSizes.lg, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 600 }}>
            {item.stockQty}
          </div>
        </div>

        {/* Adjustment Type */}
        <FormField label="Adjustment type">
          <Select value={adjType} onChange={e => onTypeChange(e.target.value as 'add' | 'remove' | 'set')}>
            <option value="add">Add stock</option>
            <option value="remove">Remove stock</option>
            <option value="set">Set to exact qty</option>
          </Select>
        </FormField>

        {/* Quantity */}
        <FormField label="Quantity" required error={adjErrors.qty} errorId="adj-qty-error">
          <TextInput
            type="number"
            value={adjQty}
            onChange={e => onQtyChange(e.target.value)}
            placeholder="0"
            aria-invalid={!!adjErrors.qty}
            aria-describedby={adjErrors.qty ? 'adj-qty-error' : undefined}
          />
        </FormField>

        {/* Preview */}
        {adjQty && (
          <div
            style={{
              padding: '8px 10px',
              background: THEME.colors.surface2,
              borderRadius: THEME.radius.sm,
              border: `1px solid ${THEME.colors.border}`,
              fontSize: THEME.fontSizes.sm,
              color: THEME.colors.ash,
              fontFamily: THEME.fonts.ui,
            }}
          >
            After adjustment: <MonoText>{newTotal()} units</MonoText>
          </div>
        )}

        {/* Reason */}
        <FormField label="Reason" required error={adjErrors.reason} errorId="adj-reason-error">
          <Select
            value={adjReason}
            onChange={e => onReasonChange(e.target.value as AdjustmentReason)}
            aria-invalid={!!adjErrors.reason}
            aria-describedby={adjErrors.reason ? 'adj-reason-error' : undefined}
          >
            {ADJUSTMENT_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Preset Reasons */}
        <div>
          <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Quick reasons
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {ADJUSTMENT_REASON_OPTIONS.slice(0, 4).map(reason => (
              <button
                key={reason.value}
                onClick={() => onPresetReason(reason.value)}
                style={{
                  flex: '1 1 calc(50% - 2px)',
                  minWidth: '120px',
                  padding: '6px 10px',
                  background: adjReason === reason.value ? 'rgba(126,201,229,0.12)' : 'rgba(201,169,110,0.04)',
                  border: `1px solid ${adjReason === reason.value ? 'rgba(126,201,229,0.3)' : 'rgba(201,169,110,0.12)'}`,
                  borderRadius: THEME.radius.sm,
                  color: adjReason === reason.value ? THEME.colors.linen : THEME.colors.ash,
                  fontSize: THEME.fontSizes.xs,
                  fontFamily: THEME.fonts.ui,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {reason.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <ActionButton onClick={onSubmit} loading={adjLoading} fullWidth>
          Update stock
        </ActionButton>
      </div>
    </Drawer>
  );
});
