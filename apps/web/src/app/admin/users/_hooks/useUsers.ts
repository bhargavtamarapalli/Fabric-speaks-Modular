import { useEffect, useState, useCallback } from 'react';
import { adminUsersApi } from '@/lib/admin/api';
import type { AdminUser } from '@/lib/admin/types';
import { mapError } from '@/lib/admin/errors';
import { useToast } from '@/components/admin/shared';

export function useUsers(params?: { role?: string; search?: string; page?: number; limit?: number; enabled?: boolean }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    if (params?.enabled === false) {
      setError(null);
      setLoading(false);
      setUsers([]);
      setMeta(null);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const response = await adminUsersApi.list(params);
      setUsers(response?.items ?? []);
      setMeta(response?.meta ?? { total: 0, page: params?.page ?? 1, limit: params?.limit ?? 20 });
    } catch (e: unknown) {
      const error = e as Error;
      setError(mapError(error));
    } finally {
      setLoading(false);
    }
  }, [params?.role, params?.search, params?.page, params?.limit, params?.enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const deactivate = useCallback(async (userId: string) => {
    if (!userId) return { success: false, error: 'No user ID provided' };
    setDeactivating(true);
    try {
      await adminUsersApi.deactivate(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('User deactivated successfully', 'success');
      return { success: true };
    } catch (e: any) {
      showToast(mapError(e), 'error');
      return { success: false, error: mapError(e) };
    } finally {
      setDeactivating(false);
    }
  }, [showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  return { users, meta, loading, error, load, deactivate, deactivating };
}
