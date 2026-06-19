'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Feature, 
  PermissionLevel, 
  hasPermission, 
  normalizeRoleName, 
  getDefaultRouteForRole,
  RoleName 
} from '@/lib/routing/config';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

interface PermissionGuardProps {
  children: React.ReactNode;
  /**
   * Required feature to access
   */
  feature: Feature;
  /**
   * Required permission level
   */
  level: PermissionLevel;
  /**
   * Optional: Show fallback UI instead of redirecting
   */
  showFallback?: boolean;
  /**
   * Optional: Custom fallback component to show when permission denied
   */
  fallback?: React.ReactNode;
  /**
   * Optional: Custom redirect path when permission denied
   */
  redirectTo?: string;
  /**
   * Optional: Show loading spinner while checking
   */
  showLoading?: boolean;
}

/**
 * PermissionGuard - Route/component guard that checks for specific permissions
 * 
 * Usage:
 * ```tsx
 * // Protect a feature requiring specific permission
 * <PermissionGuard feature={Feature.ORDERS} level={PermissionLevel.CREATE}>
 *   <CreateOrderButton />
 * </PermissionGuard>
 * 
 * // Show fallback instead of redirecting
 * <PermissionGuard 
 *   feature={Feature.ADMIN} 
 *   level={PermissionLevel.CREATE}
 *   showFallback
 * >
 *   <AdminPanel />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  children,
  feature,
  level,
  showFallback = false,
  fallback,
  redirectTo,
  showLoading = true,
}: PermissionGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth to load
    if (loading) {
      setIsChecking(true);
      return;
    }

    // No user - no access
    if (!user) {
      setHasAccess(false);
      setIsChecking(false);
      return;
    }

    // Check permission
    const userRole = user.role ? normalizeRoleName(user.role) : RoleName.CUSTOMER;
    const hasRequiredPermission = hasPermission(userRole, feature, level);
    
    if (!hasRequiredPermission) {
      // No permission - either show fallback or redirect
      if (showFallback) {
        setHasAccess(false);
      } else {
        const targetRedirect = redirectTo || getDefaultRouteForRole(userRole);
        router.push(targetRedirect);
        setHasAccess(false);
      }
      setIsChecking(false);
      return;
    }

    setHasAccess(true);
    setIsChecking(false);
  }, [user, loading, feature, level, showFallback, redirectTo, router]);

  // Show loading
  if (isChecking && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <SpiderLoader size="sm" color="var(--fs-linen)" />
      </div>
    );
  }

  // Show fallback if configured and no access
  if (!hasAccess && showFallback) {
    return (
      <>{fallback || <DefaultFallback feature={feature} level={level} />}</>
    );
  }

  // Don't render children if no access
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Default fallback UI for denied permissions
 */
function DefaultFallback({ feature, level }: { feature: Feature; level: PermissionLevel }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-[var(--fs-ash)] text-sm">
        You don't have permission to {level.toLowerCase()} {feature.replace('_', ' ')}
      </div>
    </div>
  );
}

/**
 * Check if a user has a specific permission (hook version for inline checks)
 */
export function useHasPermission(feature: Feature, level: PermissionLevel): boolean {
  const { user, loading } = useAuth();
  
  if (loading || !user) {
    return false;
  }

  const userRole = user.role ? normalizeRoleName(user.role) : RoleName.CUSTOMER;
  return hasPermission(userRole, feature, level);
}

export default PermissionGuard;
