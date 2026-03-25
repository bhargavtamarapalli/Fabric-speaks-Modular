import { useEffect, useState, useCallback } from 'react';
import { adminUsersApi } from '@/lib/admin/api';
import type { AdminUser } from '@/lib/admin/types';
import { mapError } from '@/lib/admin/errors';
import { useToast } from '@/components/admin/shared';

export function useUsers() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setUsers(await adminUsersApi.list());
    } catch (e: any) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, []);

  return { users, loading, error, load, deactivate, deactivating };
}
