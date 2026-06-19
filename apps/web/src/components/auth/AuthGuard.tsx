'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccessRoute, isPublicRoute, getDefaultRouteForRole, normalizeRoleName, RoleName } from '@/lib/routing/config';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Optional: Specific roles allowed to access this route
   * If not provided, any authenticated user can access
   */
  allowedRoles?: RoleName[];
  /**
   * Optional: Custom redirect path when access is denied
   * Defaults to role-appropriate default page
   */
  redirectTo?: string;
  /**
   * Optional: Show loading spinner while checking auth
   * Defaults to true
   */
  showLoading?: boolean;
}

/**
 * AuthGuard - Route guard that checks authentication status and optional role-based access
 * 
 * Usage:
 * ```tsx
 * // Protect a route requiring authentication
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * 
 * // Protect a route requiring specific roles
 * <AuthGuard allowedRoles={[RoleName.ADMIN, RoleName.MANAGER]}>
 *   <AdminContent />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  allowedRoles,
  redirectTo,
  showLoading = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip check for public routes
    if (isPublicRoute(pathname)) {
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    // If still loading auth state, wait
    if (loading) {
      setIsChecking(true);
      return;
    }

    // Check authorization
    const checkAuth = async () => {
      // Not authenticated - redirect to login
      if (!user) {
        const returnUrl = encodeURIComponent(pathname);
        router.push(`/login?returnUrl=${returnUrl}`);
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // Get user's normalized role
      const userRole = user.role ? normalizeRoleName(user.role) : RoleName.CUSTOMER;

      // Check role-based access if allowedRoles is specified
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(userRole)) {
          // User doesn't have required role - redirect to their default page
          const targetRedirect = redirectTo || getDefaultRouteForRole(userRole);
          router.push(targetRedirect);
          setIsAuthorized(false);
          setIsChecking(false);
          return;
        }
      }

      // Check general route access
      const accessResult = canAccessRoute(userRole, pathname);
      if (!accessResult.allowed) {
        const targetRedirect = redirectTo || accessResult.redirectTo || getDefaultRouteForRole(userRole);
        router.push(targetRedirect);
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // Authorized
      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [user, loading, pathname, router, allowedRoles, redirectTo]);

  // Show loading while checking
  if (isChecking && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <SpiderLoader size="lg" color="var(--fs-linen)" />
      </div>
    );
  }

  // Don't render children if not authorized
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Higher-order component wrapper for route protection
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<AuthGuardProps, 'children'>
) {
  return function WithAuthGuard(props: P) {
    return (
      <AuthGuard {...guardProps}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

export default AuthGuard;
