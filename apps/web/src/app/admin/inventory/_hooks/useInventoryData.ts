import { useEffect, useState, useCallback } from 'react';
import { inventoryApi } from '@/lib/admin/api';
import type { InventoryItem } from '@/lib/admin/types';
import { mapError } from '@/lib/admin/errors';

export function useInventoryData(filter: string, search: string) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await inventoryApi.list({
        status: filter || undefined,
        search: search || undefined,
      });
      setItems(res);
    } catch (e: any) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refetch: load };
}
