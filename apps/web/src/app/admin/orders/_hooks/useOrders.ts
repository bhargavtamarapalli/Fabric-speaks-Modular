'use client';

import { useState, useCallback, useMemo } from 'react';
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

export function useOrders(initialSearch: string = '') {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  const [filters, setFilters] = useState<OrdersFilters>({
    search: initialSearch,
    status: searchParams.get('filter') ?? '',
  });
  
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { 
    data, 
    error: swrError, 
    isLoading, 
    mutate 
  } = useSWR(['/admin/orders', filters], () => ordersApi.list({
    status: filters.status || undefined,
    search: filters.search || undefined
  }), {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const error = swrError ? mapError(swrError) : null;

  const updateFilters = useCallback((patch: Partial<OrdersFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
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
      const res = await ordersApi.bulkPushShiprocket(selected);
      showToast(`Pushed ${res.pushed} orders to Shiprocket`, 'success');
      setSelected([]);
      mutate();
    } catch (e: any) {
      showToast(mapError(e), 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [selected, mutate, showToast]);

  return {
    orders,
    total,
    loading: isLoading,
    error,
    filters,
    updateFilters,
    selected,
    toggleSelect,
    clearSelection,
    bulkLoading,
    handleBulkShiprocket,
    load: mutate,
  };
}
