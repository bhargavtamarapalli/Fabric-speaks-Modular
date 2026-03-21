'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ordersApi } from '@/lib/admin/api';
import type { Order } from '@/lib/admin/types';
import { useToast } from '@/components/admin/shared';

export interface OrdersFilters {
  search: string;
  status: string;
}

export function useOrders(initialSearch: string = '') {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<OrdersFilters>({
    search: initialSearch,
    status: searchParams.get('filter') ?? '',
  });
  
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setError(null);
      setLoading(true);
      const res = await ordersApi.list({ 
        status: filters.status || undefined, 
        search: filters.search || undefined 
      });
      setOrders(res.items);
      setTotal(res.total);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message ?? 'Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    return () => abortControllerRef.current?.abort();
  }, [load]);

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
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Bulk push failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [selected, load, showToast]);

  return {
    orders,
    total,
    loading,
    error,
    filters,
    updateFilters,
    selected,
    toggleSelect,
    clearSelection,
    bulkLoading,
    handleBulkShiprocket,
    load,
  };
}
