import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import type { AdminRole } from '@/lib/admin/types';
import app from '@/lib/firebase';

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  mobile?: string;
  role?: AdminRole;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app) {
      setUser(null);
      setLoading(false);
      return;
    }

    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      let role: AdminRole | undefined;
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const claim = tokenResult.claims['role'];
        if (typeof claim === 'string') {
          const roleMap: Record<string, AdminRole> = {
            SUPER_ADMIN: 'SUPER_ADMIN',
            INVENTORY_MANAGER: 'INVENTORY_MANAGER',
            SUPPORT_AGENT: 'SUPPORT_AGENT',
            superAdmin: 'SUPER_ADMIN',
            inventoryManager: 'INVENTORY_MANAGER',
            supportAgent: 'SUPPORT_AGENT',
          };
          role = roleMap[claim];
        }
      } catch {
        role = undefined;
      } finally {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName ?? firebaseUser.email ?? '',
          email: firebaseUser.email ?? '',
          mobile: firebaseUser.phoneNumber ?? '',
          role,
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (!app) return;
    await signOut(getAuth(app));
  };

  return { user, loading, logout };
};
