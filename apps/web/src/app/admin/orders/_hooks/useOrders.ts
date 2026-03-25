'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ordersApi } from '@/lib/admin/api';
import type { Order } from '@/lib/admin/types';
import { useToast } from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

export interface OrdersFilters {
  search: string;
  status: string;
}

const DEFAULT_LIMIT = 20;

export function useOrders(initialSearch: string = '') {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  const [filters, setFilters] = useState<OrdersFilters>({
    search: initialSearch,
    status: searchParams.get('filter') ?? '',
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_LIMIT);
  
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.search]);

  const { 
    data, 
    error: swrError, 
    isLoading, 
    mutate 
  } = useSWR(['/admin/orders', filters, currentPage, itemsPerPage], () => ordersApi.list({
    status: filters.status || undefined,
    search: filters.search || undefined,
    page: currentPage,
    limit: itemsPerPage,
  }), {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? currentPage;
  const limit = data?.limit ?? itemsPerPage;
  const totalPages = data?.totalPages ?? Math.ceil(total / limit);
  const error = swrError ? mapError(swrError) : null;

  const updateFilters = useCallback((patch: Partial<OrdersFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  const handleBulkShiprocket = useCallback(async () => {
    try {
      setBulkLoading(true);
      
      // Wrap API call with 30-second timeout (I3-2)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Shiprocket request timed out. Please try again.')), 30000)
      );
      
      const res = await Promise.race([
        ordersApi.bulkPushShiprocket(selected),
        timeoutPromise,
      ]) as any;
      
      showToast(`Pushed ${res.pushed} orders to Shiprocket`, 'success');
      setSelected([]);
      mutate();
    } catch (e: any) {
      const errorMessage = e.message || mapError(e);
      showToast(errorMessage, 'error');
      
      // For timeout errors, suggest retry
      if (e.message?.includes('timed out')) {
        showToast('Check your connection. You can retry the push.', 'info');
      }
    } finally {
      setBulkLoading(false);
    }
  }, [selected, mutate, showToast]);

  return {
    orders,
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
    selected,
    toggleSelect,
    clearSelection,
    bulkLoading,
    handleBulkShiprocket,
    load: mutate,
  };
}
