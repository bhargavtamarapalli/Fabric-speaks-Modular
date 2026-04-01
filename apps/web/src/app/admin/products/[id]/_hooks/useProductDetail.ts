'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { productsApi } from '@/lib/admin/api';
import type { Product } from '@/lib/admin/types';
import { useToast } from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

export type VariantEdit = {
  variantId: string;
  price: string;
  comparePrice: string;
  stockQty: string;
  colourImageUrl: string;
};

export type VariantErrors = Partial<Record<keyof VariantEdit, string>>;

export function useProductDetail(productId: string | undefined) {
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [edits, setEdits] = useState<VariantEdit[]>([]);
  const [errors, setErrors] = useState<Record<string, VariantErrors>>({});
  const [saving, setSaving] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setError(null);
      setLoading(true);
      const res = await productsApi.getById(productId, abortControllerRef.current?.signal);
      if (!res.isActive) {
        setError('This product is currently deactivated/deleted.');
      }
      setProduct(res);
      setEdits(res.variants.map(v => ({
        variantId: v.id,
        price: String(v.price ?? ''),
        comparePrice: v.comparePrice ? String(v.comparePrice) : '',
        stockQty: String(v.stockQty ?? 0),
        colourImageUrl: v.colourImageUrl ?? '',
      })));
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(mapError(e));
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { 
    load(); 
    return () => abortControllerRef.current?.abort();
  }, [load]);

  const updateEdit = useCallback((variantId: string, patch: Partial<VariantEdit>) => {
    setEdits(prev => prev.map(v => v.variantId === variantId ? { ...v, ...patch } : v));
    setErrors(prev => {
      if (!prev[variantId]) return prev;
      const nextVariantErrors = { ...prev[variantId] };
      Object.keys(patch).forEach(key => {
        delete nextVariantErrors[key as keyof VariantEdit];
      });
      return { ...prev, [variantId]: nextVariantErrors };
    });
  }, []);

  const validate = useCallback(() => {
    const nextErrors: Record<string, VariantErrors> = {};
    edits.forEach(v => {
      const e: VariantErrors = {};
      if (!v.price || Number(v.price) <= 0) e.price = 'Price must be a positive number';
      if (v.comparePrice && Number(v.comparePrice) < 0) e.comparePrice = 'Compare price must be positive';
      if (!v.stockQty || Number(v.stockQty) < 0) e.stockQty = 'Stock must be 0 or higher';
      if (v.colourImageUrl && !v.colourImageUrl.startsWith('https://')) e.colourImageUrl = 'Enter a valid URL starting with https://';
      if (Object.values(e).some(Boolean)) nextErrors[v.variantId] = e;
    });
    return nextErrors;
  }, [edits]);

  const adjustVariantStock = useCallback((variantId: string, delta: number) => {
    setEdits(prev => prev.map(v => {
      if (v.variantId !== variantId) return v;
      const current = Number(v.stockQty) || 0;
      return { ...v, stockQty: String(Math.max(0, current + delta)) };
    }));
  }, []);

  const batchAdjustStock = useCallback((delta: number) => {
    setEdits(prev => prev.map(v => {
      const current = Number(v.stockQty) || 0;
      return { ...v, stockQty: String(Math.max(0, current + delta)) };
    }));
  }, []);

  const handleBulkUpdate = useCallback(async () => {
    if (!product) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      await productsApi.bulkUpdateVariants(product.id, edits.map(v => ({
        variantId: v.variantId,
        stockQty: Number(v.stockQty),
        price: Number(v.price),
        comparePrice: v.comparePrice ? Number(v.comparePrice) : undefined,
        colourImageUrl: v.colourImageUrl || undefined,
      })));
      showToast('Variants updated', 'success');
      setDrawerOpen(false);
      load();
    } catch (e: any) {
      showToast(mapError(e), 'error');
    } finally {
      setSaving(false);
    }
  }, [product, edits, validate, load, showToast]);

  return {
    product,
    loading,
    error,
    drawerOpen,
    setDrawerOpen,
    edits,
    updateEdit,
    errors,
    saving,
    handleBulkUpdate,
    adjustVariantStock,
    batchAdjustStock,
    load,
  };
}
