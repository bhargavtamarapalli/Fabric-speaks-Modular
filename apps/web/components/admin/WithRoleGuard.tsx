'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import type { AdminRole } from '@/lib/admin/types';

interface WithRoleGuardProps {
  children: ReactNode;
  allowedRoles: AdminRole[];
}

export const WithRoleGuard = ({ children, allowedRoles }: WithRoleGuardProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login?redirect=/admin');
        return;
      }
      if (!user.role || !allowedRoles.includes(user.role as AdminRole)) {
        router.push('/admin/unauthorized');
      }
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--fs-void)]">
        <SpiderLoader size="lg" />
      </div>
    );
  }

  if (!user || !user.role || !allowedRoles.includes(user.role as AdminRole)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

// Helper specific layout wrapper shortcuts
export const SuperAdminOnly = ({ children }: { children: ReactNode }) => (
  <WithRoleGuard allowedRoles={['SUPER_ADMIN']}>{children}</WithRoleGuard>
);

// Admins + Support Agents (for Support queue / Read-only orders)
export const SupportAllowed = ({ children }: { children: ReactNode }) => (
  <WithRoleGuard allowedRoles={['SUPER_ADMIN', 'SUPPORT_AGENT']}>{children}</WithRoleGuard>
);

// Admins + Inventory Managers (for Products/Inventory/Categories/Collections)
export const InventoryAllowed = ({ children }: { children: ReactNode }) => (
  <WithRoleGuard allowedRoles={['SUPER_ADMIN', 'INVENTORY_MANAGER']}>{children}</WithRoleGuard>
);
