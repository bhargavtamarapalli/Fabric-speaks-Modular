'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import type { AdminRole } from '@/lib/admin/types';
import app from '@/lib/firebase';

interface AdminAuthContextType {
  role: AdminRole | null;
  name: string;
  email: string;
  loading: boolean;
  user: User | null;
  error: string | null;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ROLE_MAP: Record<string, AdminRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  superAdmin: 'SUPER_ADMIN',
  inventoryManager: 'INVENTORY_MANAGER',
  supportAgent: 'SUPPORT_AGENT',
};

/**
 * Mask email for privacy in logs (e.g., b***@example.com)
 */
const maskEmail = (email?: string | null): string => {
  if (!email) return 'unknown';
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user.charAt(0)}***@${domain}`;
};

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
          // FALLBACK: Use main AuthContext role if available (trusting DB role in dev)
          // We can't use useAuth here directly inside useEffect, but we can pass it down or handle it in the layout.
          // For now, we'll log carefully and wait for the claim.
          if (claim) {
            console.warn(`[AdminAuth] Unrecognized claim: "${claim}". User ${maskEmail(firebaseUser.email)} denied admin access.`);
          } else {
            console.warn(`[AdminAuth] User ${maskEmail(firebaseUser.email)} has no "role" claim. Check if user is promoted in DB.`);
          }
          setRole(null);
          // Only show error if we've really checked everything
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
              email: maskEmail(firebaseUser.email),
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

  const logout = useCallback(async () => {
    if (!app) return;
    await signOut(getAuth(app));
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consuming components
  const contextValue = useMemo(
    () => ({ role, name, email, loading, user, error, logout }),
    [role, name, email, loading, user, error, logout]
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
