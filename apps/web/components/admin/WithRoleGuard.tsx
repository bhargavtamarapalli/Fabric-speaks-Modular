import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import type { AdminRole } from '@/lib/admin/types';

interface WithRoleGuardProps {
  children: ReactNode;
  allowedRoles: AdminRole[];
}

export const WithRoleGuard = ({ children, allowedRoles }: WithRoleGuardProps) => {
  const router = useRouter();
  const { activeRole, isLoading, isAuthenticated, isSyncing } = useEffectiveRole();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin');
        return;
      }

      // If we are authenticated but have no active role, and we are NOT currently syncing,
      // then the user is truly unauthorized for admin.
      if (!activeRole && !isSyncing) {
        router.push('/admin/unauthorized');
        return;
      }

      // Check specific role permissions if required
      if (allowedRoles.length > 0 && activeRole && !allowedRoles.includes(activeRole)) {
        router.push('/admin/unauthorized');
      }
    }
  }, [isAuthenticated, activeRole, isLoading, isSyncing, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--fs-void)]">
        <SpiderLoader size="lg" />
      </div>
    );
  }

  // Show a loading state while syncing to prevent protected content from flashing
  if (isSyncing && !activeRole) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--fs-void)]">
        <SpiderLoader size="lg" />
      </div>
    );
  }

  // Only render children when authenticated and the role is explicitly permitted
  const canRender = isAuthenticated && !!activeRole && allowedRoles.includes(activeRole);

  if (!canRender) {
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
