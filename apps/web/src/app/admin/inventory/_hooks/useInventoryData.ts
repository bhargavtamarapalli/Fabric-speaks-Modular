import { useEffect, useState, useCallback } from 'react';
import { inventoryApi } from '@/lib/admin/api';
import type { InventoryItem } from '@/lib/admin/types';
import { isServiceUnavailableError, mapError } from '@/lib/admin/errors';

export function useInventoryData(filter: string, search: string) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setServiceUnavailable(false);
      setLoading(true);
      const res = await inventoryApi.list({
        status: filter || undefined,
        search: search || undefined,
      });
      setItems(res);
    } catch (e: any) {
      if (isServiceUnavailableError(e)) {
        setServiceUnavailable(true);
        setError(mapError(e));
      } else {
        setError(mapError(e));
      }
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, serviceUnavailable, refetch: load };
}
