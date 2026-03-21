'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import type { AdminRole } from '@/lib/admin/types';
import app from '@/lib/firebase';

interface AdminAuthContextType {
  role: AdminRole | null;
  name: string;
  email: string;
  loading: boolean;
  user: User | null;
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ROLE_MAP: Record<string, AdminRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  SUPPORT_AGENT: 'SUPER_ADMIN', // Note: Check if this was a typo in original or intentional
  superAdmin: 'SUPER_ADMIN',
  inventoryManager: 'INVENTORY_MANAGER',
  supportAgent: 'SUPPORT_AGENT',
};

// Fixed support agent mapping if it was a typo:
ROLE_MAP['SUPPORT_AGENT'] = 'SUPPORT_AGENT';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!app) {
      setRole(null);
      setError('AUTH_FAILED');
      setLoading(false);
      return;
    }

    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setRole(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const claim = tokenResult.claims['role'] as string | undefined;
        const mappedRole = claim ? ROLE_MAP[claim] : undefined;

        if (!mappedRole) {
          if (claim) {
            console.warn(`[AdminAuth] Unrecognized claim: "${claim}". User ${firebaseUser.email} denied admin access.`);
          } else {
            console.warn(`[AdminAuth] User ${firebaseUser.email} has no "role" claim. Denied admin access.`);
          }
          setRole(null);
          setError('ROLE_REQUIRED');
        } else {
          setRole(mappedRole);
          setError(null);
          setName(firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Admin');
          setEmail(firebaseUser.email ?? '');
        }
      } catch (error) {
        console.error('Error fetching admin role:', error);
        // Log detailed info for debugging role issues
        if (firebaseUser) {
          firebaseUser.getIdTokenResult(true).then(tokenResult => {
            console.error('[AdminAuth] Role claim debug:', {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              claims: tokenResult.claims,
              tokenIssued: tokenResult.issuedAtTime,
              tokenExpiry: tokenResult.expirationTime
            });
          }).catch(e => console.error('[AdminAuth] Could not get token result for debug:', e));
        }
        setRole(null);
        setError('AUTH_FAILED');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consuming components
  const contextValue = useMemo(
    () => ({ role, name, email, loading, user, error }),
    [role, name, email, loading, user, error]
  );

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
