/**
 * Auth Components Index
 * 
 * This module exports all authentication-related components and utilities.
 */

export { AuthGuard, withAuthGuard } from './AuthGuard';
export { PermissionGuard, useHasPermission } from './PermissionGuard';

// Re-export types from routing config
export type { RouteConfig, NavItem } from '@/lib/routing/config';
export {
    RoleName,
    Feature,
    PermissionLevel,
    hasPermission,
    canAccessRoute,
    canAccessAdmin,
    getDefaultRouteForRole,
    normalizeRoleName,
    isPublicRoute,
    isAdminRoute,
    getRouteConfig,
    getNavItemsForRole,
    getSessionTimeout,
    ROLE_DEFAULT_ROUTES,
    PUBLIC_ROUTES,
    ADMIN_ROUTES,
    CUSTOMER_ROUTES,
    AUTH_ERRORS,
    SESSION_TIMEOUT_MS,
} from '@/lib/routing/config';
