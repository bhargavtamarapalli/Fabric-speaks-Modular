'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { RoleName } from '@/lib/routing/config';
import type { AdminRole } from '../../lib/admin/types';

/**
 * Hook to resolve the effective role by combining Database (AuthContext) 
 * and Firebase (AdminAuthContext) authentication states.
 * 
 * Logic:
 * 1. Prioritize 'adminRole' from Firebase Custom Claims (the high-security source).
 * 2. Fallback to 'dbRole' from PostgreSQL (the source of truth) ONLY while syncing.
 * 3. Provide a 'isSyncing' flag to help the UI show loading/syncing states.
 */
export function useEffectiveRole() {
  const { role: adminRole, loading: adminLoading } = useAdminAuth();
  const { role: dbRole, loading: dbLoading, user: dbUser } = useAuth();
  
  // Track if we have already attempted a sync/refresh in this session
  const [syncAttempted, setSyncAttempted] = useState(false);

  // Determine if the DB thinks this user is an admin
  const isDbAdmin = useMemo(() => {
    return !!(dbRole && dbRole !== RoleName.CUSTOMER);
  }, [dbRole]);

  // Determine if we are currently in a "Syncing" state
  // We are syncing if the DB says Admin, but Firebase hasn't confirmed it yet,
  // AND we haven't finished a sync cycle.
  const isSyncing = useMemo(() => {
    return !!(isDbAdmin && !adminRole && !adminLoading);
  }, [isDbAdmin, adminRole, adminLoading]);

  // The active role is the Firebase claim if present, otherwise the DB role as a fallback
  const activeRole = useMemo((): AdminRole | null => {
    if (adminRole) return adminRole;
    
    if (isDbAdmin) {
      // Map RoleName enum to AdminRole string if necessary
      // In this project, they are mostly compatible strings once normalized
      if (dbRole === RoleName.ADMIN) return 'SUPER_ADMIN';
      if (dbRole === RoleName.MANAGER) return 'INVENTORY_MANAGER';
      if (dbRole === RoleName.SUPPORT_STAFF) return 'SUPPORT_AGENT';
    }
    
    return null;
  }, [adminRole, dbRole, isDbAdmin]);

  const isLoading = adminLoading || dbLoading;
  const isAuthenticated = !!(adminRole || (dbRole && dbUser));

  return {
    activeRole,
    isSyncing,
    isLoading,
    isAuthenticated,
    adminRole,
    dbRole,
  };
}
