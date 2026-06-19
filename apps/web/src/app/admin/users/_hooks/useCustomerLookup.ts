import { useEffect, useState, useCallback } from 'react';
import { customersApi } from '@/lib/admin/api';
import type { CustomerSummary } from '@/lib/admin/types';
import { mapError } from '@/lib/admin/errors';

export function useCustomerLookup(query: string) {
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const data = await customersApi.search(query.trim());
      setResults(data ?? []);
    } catch (e: unknown) {
      const error = e as Error;
      setError(mapError(error));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 350);
    return () => clearTimeout(timeout);
  }, [load]);

  return { results, loading, error, reload: load };
}
