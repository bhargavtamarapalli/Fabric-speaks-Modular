'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { productsApi } from '@/lib/admin/api';
import type { Product } from '@/lib/admin/types';
import { useToast } from '@/components/admin/shared';
import { isServiceUnavailableError, mapError } from '@/lib/admin/errors';

export interface ProductsFilters {
  search: string;
  fabric: string;
  status: string;
}

const DEFAULT_LIMIT = 20;

export function useProducts(initialFilters: ProductsFilters) {
  const { showToast } = useToast();
  
  const [filters, setFilters] = useState<ProductsFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_LIMIT);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.fabric, filters.status, filters.search]);

  const {
    data,
    error: swrError,
    isLoading,
    mutate
  } = useSWR(['/admin/products', filters, currentPage, itemsPerPage], () => productsApi.list({
    fabric: filters.fabric !== 'All' ? filters.fabric : undefined,
    status: filters.status !== 'All' ? filters.status.toUpperCase() : undefined,
    search: filters.search || undefined,
    page: currentPage,
    limit: itemsPerPage,
  }), {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? currentPage;
  const limit = data?.limit ?? itemsPerPage;
  const totalPages = data?.totalPages ?? Math.ceil(total / limit);
  const error = swrError ? (isServiceUnavailableError(swrError) ? null : mapError(swrError)) : null;

  const updateFilters = useCallback((patch: Partial<ProductsFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      setDelLoading(true);
      await productsApi.deactivate(deleteId);
      showToast('Product removed from store', 'success');
      setDeleteId(null);
      mutate();
    } catch (e: any) {
      showToast(mapError(e), 'error');
    } finally {
      setDelLoading(false);
    }
  }, [deleteId, mutate, showToast]);

  return {
    products,
    total,
    page,
    limit,
    totalPages,
    currentPage,
    itemsPerPage,
    loading: isLoading,
    error,
    filters,
    updateFilters,
    goToPage,
    deleteId,
    setDeleteId,
    delLoading,
    handleDelete,
    hoverId,
    setHoverId,
    load: mutate,
  };
}
