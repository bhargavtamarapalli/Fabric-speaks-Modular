import { useState, useCallback } from 'react';
import { inventoryApi } from '@/lib/admin/api';
import type { InventoryItem } from '@/lib/admin/types';
import { mapError } from '@/lib/admin/errors';
import type { AdjustmentReason } from '../_utils/inventoryHelpers';

export function useAdjustmentForm({ onSuccess }: { onSuccess: () => void }) {
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjType, setAdjType] = useState<'add' | 'remove' | 'set'>('add');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState<AdjustmentReason>('correction');
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjErrors, setAdjErrors] = useState<{ qty?: string; reason?: string }>({});

  const newTotal = useCallback(() => {
    if (!adjustItem || !adjQty) return adjustItem?.stockQty ?? 0;
    const q = parseInt(adjQty, 10) || 0;
    if (adjType === 'add') return adjustItem.stockQty + q;
    if (adjType === 'remove') return Math.max(0, adjustItem.stockQty - q);
    return q;
  }, [adjustItem, adjQty, adjType]);

  const validate = useCallback(() => {
    const next: { qty?: string; reason?: string } = {};
    const qtyValue = parseInt(adjQty, 10);
    
    if (!adjQty.trim()) {
      next.qty = 'Quantity is required';
    } else if (Number.isNaN(qtyValue)) {
      next.qty = 'Quantity must be a valid number';
    } else if (adjType === 'set') {
      // For 'set' mode, ensure final stock is not negative
      if (qtyValue < 0) {
        next.qty = 'Stock quantity cannot be negative';
      } else if (qtyValue === 0) {
        // Allow 0 but log that this will clear the stock
        // Validation passes
      }
    } else if (adjType === 'remove') {
      // For 'remove' mode, ensure we don't remove more than available
      if (qtyValue <= 0) {
        next.qty = 'Quantity to remove must be positive';
      } else if (qtyValue > (adjustItem?.stockQty || 0)) {
        next.qty = `Cannot remove more than available stock (${adjustItem?.stockQty} available)`;
      }
    } else if (adjType === 'add') {
      // For 'add' mode, ensure positive quantity
      if (qtyValue <= 0) {
        next.qty = 'Quantity to add must be positive';
      }
    }
    
    return next;
  }, [adjQty, adjType, adjustItem]);

  const reset = useCallback(() => {
    setAdjustItem(null);
    setAdjQty('');
    setAdjReason('correction');
    setAdjErrors({});
    setAdjType('add');
  }, []);

  const handleAdjust = useCallback(
    async (variantId: string) => {
      const validationErrors = validate();
      if (Object.values(validationErrors).some(Boolean)) {
        setAdjErrors(validationErrors);
        return { success: false, error: null };
      }
      try {
        setAdjLoading(true);
        const nextQty = newTotal();
        const response = await inventoryApi.adjust(variantId, {
          newQty: nextQty,
          reason: adjReason,
        });
        
        // Validate response structure (I3-1)
        if (!response || typeof response !== 'object') {
          console.error('Invalid response structure from adjustment API:', response);
          return { success: false, error: 'Invalid server response. Please try again.' };
        }
        
        // Ensure critical fields exist in response (InventoryItem has variantId, not id)
        if (!response.variantId || response.stockQty === undefined) {
          console.error('Response missing required fields:', response);
          return { success: false, error: 'Server returned incomplete data. Please refresh and try again.' };
        }
        
        reset();
        onSuccess?.();
        return { success: true };
      } catch (e: unknown) {
        const error = e as Error;
        return { success: false, error: mapError(error) };
      } finally {
        setAdjLoading(false);
      }
    },
    [validate, newTotal, adjReason, onSuccess, reset]
  );

  const openForm = useCallback((item: InventoryItem) => {
    setAdjustItem(item);
    setAdjType('add');
    setAdjQty('');
    setAdjReason('correction');
    setAdjErrors({});
  }, []);

  return {
    adjustItem,
    adjType,
    setAdjType,
    adjQty,
    setAdjQty,
    adjReason,
    setAdjReason,
    adjErrors,
    adjLoading,
    newTotal,
    handleAdjust,
    reset,
    openForm,
  };
}
