'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { productsApi } from '@/lib/admin/api';
import type { Product } from '@/lib/admin/types';
import { useToast } from '@/components/admin/shared';

export interface ProductsFilters {
  search: string;
  fabric: string;
  status: string;
}

export function useProducts(initialFilters: ProductsFilters) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<ProductsFilters>(initialFilters);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setError(null);
      setLoading(true);
      const res = await productsApi.list({
        fabric: filters.fabric !== 'All' ? filters.fabric : undefined,
        status: filters.status !== 'All' ? filters.status.toUpperCase() : undefined,
        search: filters.search || undefined,
      });
      setProducts(res.items);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message ?? 'Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    return () => abortControllerRef.current?.abort();
  }, [load]);

  const updateFilters = useCallback((patch: Partial<ProductsFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      setDelLoading(true);
      await productsApi.deactivate(deleteId);
      showToast('Product removed from store', 'success');
      setDeleteId(null);
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Delete failed', 'error');
    } finally {
      setDelLoading(false);
    }
  }, [deleteId, load, showToast]);

  return {
    products,
    loading,
    error,
    filters,
    updateFilters,
    deleteId,
    setDeleteId,
    delLoading,
    handleDelete,
    hoverId,
    setHoverId,
    load,
  };
}
