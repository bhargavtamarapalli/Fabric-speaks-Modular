/**
 * Role-Based Routing Configuration
 * 
 * This module defines the routing configuration for role-based access control.
 * It maps roles to their default landing pages and defines protected route requirements.
 * 
 * Roles:
 * - ADMIN: Full administrative access to all features
 * - MANAGER: Middle management with oversight capabilities  
 * - SUPPORT_STAFF: Customer support representatives
 * - WORKING_PROFESSIONAL: Regular authenticated customer with professional account
 * - CUSTOMER: Basic customer account
 */

// ============================================================================
// Local Type Definitions (mirrored from @fs/shared)
// ============================================================================

/**
 * Role names in the permission system
 */
export enum RoleName {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SUPPORT_STAFF = 'SUPPORT_STAFF',
  WORKING_PROFESSIONAL = 'WORKING_PROFESSIONAL',
  CUSTOMER = 'CUSTOMER',
}

/**
 * Features that can be accessed based on permissions
 */
export enum Feature {
  DASHBOARD = 'dashboard',
  ORDERS = 'orders',
  PRODUCTS = 'products',
  INVENTORY = 'inventory',
  RETURNS = 'returns',
  SUPPORT = 'support',
  COLLECTIONS = 'collections',
  CATEGORIES = 'categories',
  COUPONS = 'coupons',
  CONTENT = 'content',
  USERS = 'users',
  SETTINGS = 'settings',
  CHECKOUT = 'checkout',
  PROFILE = 'profile',
  ADDRESSES = 'addresses',
  WISHLIST = 'wishlist',
  TRACK_ORDER = 'track_order',
}

/**
 * Permission levels
 */
export enum PermissionLevel {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * Permission matrix type
 */
export type PermissionMatrix = Record<RoleName, Record<Feature, PermissionLevel[]>>;

// ============================================================================
// Permission Matrix (local copy for frontend)
// ============================================================================

/**
 * Complete permission matrix defining what each role can do
 * This mirrors the backend PERMISSION_MATRIX from @fs/shared
 */
const PERMISSION_MATRIX: PermissionMatrix = {
  // ADMIN - Full access to all features
  [RoleName.ADMIN]: {
    [Feature.DASHBOARD]: [PermissionLevel.READ],
    [Feature.ORDERS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.PRODUCTS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.INVENTORY]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.RETURNS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.SUPPORT]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.COLLECTIONS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.CATEGORIES]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.COUPONS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.CONTENT]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.USERS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.SETTINGS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.CHECKOUT]: [PermissionLevel.READ],
    [Feature.PROFILE]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.ADDRESSES]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.WISHLIST]: [PermissionLevel.READ],
    [Feature.TRACK_ORDER]: [PermissionLevel.READ],
  },

  // MANAGER - Limited admin access, focus on operations
  [RoleName.MANAGER]: {
    [Feature.DASHBOARD]: [PermissionLevel.READ],
    [Feature.ORDERS]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.PRODUCTS]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.INVENTORY]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.RETURNS]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.SUPPORT]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.COLLECTIONS]: [PermissionLevel.READ],
    [Feature.CATEGORIES]: [PermissionLevel.READ],
    [Feature.COUPONS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.CONTENT]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.USERS]: [PermissionLevel.READ],
    [Feature.SETTINGS]: [PermissionLevel.READ],
    [Feature.CHECKOUT]: [PermissionLevel.READ],
    [Feature.PROFILE]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.ADDRESSES]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.WISHLIST]: [PermissionLevel.READ],
    [Feature.TRACK_ORDER]: [PermissionLevel.READ],
  },

  // SUPPORT_STAFF - Customer support focused
  [RoleName.SUPPORT_STAFF]: {
    [Feature.DASHBOARD]: [PermissionLevel.READ],
    [Feature.ORDERS]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.PRODUCTS]: [PermissionLevel.READ],
    [Feature.INVENTORY]: [PermissionLevel.READ],
    [Feature.RETURNS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.SUPPORT]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.COLLECTIONS]: [PermissionLevel.READ],
    [Feature.CATEGORIES]: [PermissionLevel.READ],
    [Feature.COUPONS]: [PermissionLevel.READ],
    [Feature.CONTENT]: [PermissionLevel.READ],
    [Feature.USERS]: [PermissionLevel.READ],
    [Feature.SETTINGS]: [PermissionLevel.READ],
    [Feature.CHECKOUT]: [PermissionLevel.READ],
    [Feature.PROFILE]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.ADDRESSES]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.WISHLIST]: [PermissionLevel.READ],
    [Feature.TRACK_ORDER]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
  },

  // WORKING_PROFESSIONAL - Enhanced customer with business features
  [RoleName.WORKING_PROFESSIONAL]: {
    [Feature.DASHBOARD]: [PermissionLevel.READ],
    [Feature.ORDERS]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.PRODUCTS]: [PermissionLevel.READ],
    [Feature.INVENTORY]: [PermissionLevel.READ],
    [Feature.RETURNS]: [PermissionLevel.CREATE, PermissionLevel.READ],
    [Feature.SUPPORT]: [PermissionLevel.CREATE, PermissionLevel.READ],
    [Feature.COLLECTIONS]: [PermissionLevel.READ],
    [Feature.CATEGORIES]: [PermissionLevel.READ],
    [Feature.COUPONS]: [PermissionLevel.READ],
    [Feature.CONTENT]: [PermissionLevel.READ],
    [Feature.USERS]: [],
    [Feature.SETTINGS]: [],
    [Feature.CHECKOUT]: [PermissionLevel.CREATE, PermissionLevel.READ],
    [Feature.PROFILE]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.ADDRESSES]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.WISHLIST]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.TRACK_ORDER]: [PermissionLevel.CREATE, PermissionLevel.READ],
  },

  // CUSTOMER - Basic customer account
  [RoleName.CUSTOMER]: {
    [Feature.DASHBOARD]: [PermissionLevel.READ],
    [Feature.ORDERS]: [PermissionLevel.CREATE, PermissionLevel.READ],
    [Feature.PRODUCTS]: [PermissionLevel.READ],
    [Feature.INVENTORY]: [PermissionLevel.READ],
    [Feature.RETURNS]: [PermissionLevel.CREATE, PermissionLevel.READ],
    [Feature.SUPPORT]: [PermissionLevel.CREATE, PermissionLevel.READ],
    [Feature.COLLECTIONS]: [PermissionLevel.READ],
    [Feature.CATEGORIES]: [PermissionLevel.READ],
    [Feature.COUPONS]: [PermissionLevel.READ],
    [Feature.CONTENT]: [PermissionLevel.READ],
    [Feature.USERS]: [],
    [Feature.SETTINGS]: [],
    [Feature.CHECKOUT]: [PermissionLevel.CREATE, PermissionLevel.READ],
    [Feature.PROFILE]: [PermissionLevel.READ, PermissionLevel.UPDATE],
    [Feature.ADDRESSES]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.WISHLIST]: [PermissionLevel.CREATE, PermissionLevel.READ, PermissionLevel.UPDATE, PermissionLevel.DELETE],
    [Feature.TRACK_ORDER]: [PermissionLevel.CREATE, PermissionLevel.READ],
  },
};

// ============================================================================
// Permission Check Functions
// ============================================================================

/**
 * Check if a role has a specific permission level for a feature
 */
export function hasPermission(
  roleName: RoleName,
  feature: Feature,
  requiredLevel: PermissionLevel
): boolean {
  const permissions = PERMISSION_MATRIX[roleName]?.[feature];
  if (!permissions) {
    return false;
  }
  return permissions.includes(requiredLevel);
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Route configuration for a protected route
 */
export interface RouteConfig {
  /** The path pattern (supports dynamic segments like :id) */
  path: string;
  /** Required roles to access this route (if empty, any authenticated user can access) */
  allowedRoles?: RoleName[];
  /** Required permissions to access this route */
  requiredPermissions?: { feature: Feature; level: PermissionLevel }[];
  /** Whether this route requires authentication */
  requiresAuth: boolean;
  /** Custom redirect path if access is denied */
  redirectTo?: string;
}

/**
 * Role-based navigation item
 */
export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  roles: RoleName[];
  permissions?: { feature: Feature; level: PermissionLevel }[];
  children?: NavItem[];
}

// ============================================================================
// Role to Path Mappings
// ============================================================================

/**
 * Default landing pages for each role
 * These paths are used after successful authentication to redirect users to their appropriate dashboard
 */
export const ROLE_DEFAULT_ROUTES: Record<RoleName, string> = {
  [RoleName.ADMIN]: '/admin/dashboard',
  [RoleName.MANAGER]: '/admin/dashboard',
  [RoleName.SUPPORT_STAFF]: '/admin/dashboard',
  [RoleName.WORKING_PROFESSIONAL]: '/account',
  [RoleName.CUSTOMER]: '/',
};

/**
 * Routes that are accessible without authentication (public routes)
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/collections',
  '/collections/[slug]',
  '/products/[id]',
  '/forgot-password',
  '/reset-password',
];

/**
 * Routes that require authentication but not admin access
 */
export const AUTHENTICATED_ROUTES = [
  '/account',
  '/account/profile',
  '/account/addresses',
  '/account/orders',
  '/account/orders/[orderId]',
  '/account/orders/[orderId]/return',
  '/account/notifications',
  '/account/wishlist',
  '/cart',
  '/checkout',
];

/**
 * Admin routes configuration with role-based access
 */
export const ADMIN_ROUTES: RouteConfig[] = [
  // Dashboard - all admin roles
  {
    path: '/admin/dashboard',
    allowedRoles: [RoleName.ADMIN, RoleName.MANAGER, RoleName.SUPPORT_STAFF],
    requiresAuth: true,
  },
  // Orders - ADMIN, MANAGER, SUPPORT_STAFF
  {
    path: '/admin/orders',
    allowedRoles: [RoleName.ADMIN, RoleName.SUPPORT_STAFF],
    requiredPermissions: [{ feature: Feature.ORDERS, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Products - ADMIN, MANAGER
  {
    path: '/admin/products',
    allowedRoles: [RoleName.ADMIN, RoleName.MANAGER],
    requiredPermissions: [{ feature: Feature.PRODUCTS, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Inventory - ADMIN, MANAGER
  {
    path: '/admin/inventory',
    allowedRoles: [RoleName.ADMIN, RoleName.MANAGER],
    requiredPermissions: [{ feature: Feature.INVENTORY, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Returns - ADMIN, MANAGER, SUPPORT_STAFF
  {
    path: '/admin/returns',
    allowedRoles: [RoleName.ADMIN, RoleName.MANAGER, RoleName.SUPPORT_STAFF],
    requiredPermissions: [{ feature: Feature.RETURNS, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Support - ADMIN, SUPPORT_STAFF
  {
    path: '/admin/support',
    allowedRoles: [RoleName.ADMIN, RoleName.SUPPORT_STAFF],
    requiredPermissions: [{ feature: Feature.SUPPORT, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Collections - ADMIN, MANAGER
  {
    path: '/admin/collections',
    allowedRoles: [RoleName.ADMIN, RoleName.MANAGER],
    requiredPermissions: [{ feature: Feature.COLLECTIONS, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Categories - ADMIN, MANAGER
  {
    path: '/admin/categories',
    allowedRoles: [RoleName.ADMIN, RoleName.MANAGER],
    requiredPermissions: [{ feature: Feature.CATEGORIES, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Coupons - ADMIN only
  {
    path: '/admin/coupons',
    allowedRoles: [RoleName.ADMIN],
    requiredPermissions: [{ feature: Feature.COUPONS, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Content/Pages - ADMIN only
  {
    path: '/admin/pages',
    allowedRoles: [RoleName.ADMIN],
    requiredPermissions: [{ feature: Feature.CONTENT, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Users - ADMIN only
  {
    path: '/admin/users',
    allowedRoles: [RoleName.ADMIN],
    requiredPermissions: [{ feature: Feature.USERS, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
  // Settings - ADMIN only
  {
    path: '/admin/config',
    allowedRoles: [RoleName.ADMIN],
    requiredPermissions: [{ feature: Feature.SETTINGS, level: PermissionLevel.READ }],
    requiresAuth: true,
  },
];

/**
 * Customer-facing authenticated routes
 */
export const CUSTOMER_ROUTES: RouteConfig[] = [
  {
    path: '/account',
    requiresAuth: true,
  },
  {
    path: '/account/profile',
    requiresAuth: true,
  },
  {
    path: '/account/addresses',
    requiresAuth: true,
  },
  {
    path: '/account/orders',
    requiresAuth: true,
  },
  {
    path: '/account/notifications',
    requiresAuth: true,
  },
  {
    path: '/account/wishlist',
    requiresAuth: true,
  },
  {
    path: '/cart',
    requiresAuth: false, // Allow viewing cart without auth
  },
  {
    path: '/checkout',
    requiresAuth: true,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the default route for a user's role
 */
export function getDefaultRouteForRole(role: RoleName | string | undefined): string {
  if (!role) return '/';
  
  // Normalize role to RoleName
  const normalizedRole = normalizeRoleName(role);
  return ROLE_DEFAULT_ROUTES[normalizedRole] || '/';
}

/**
 * Normalize role name to RoleName enum
 */
export function normalizeRoleName(role: string): RoleName {
  const upperRole = role.toUpperCase();
  
  if (upperRole === 'ADMIN' || upperRole === 'SUPER_ADMIN' || upperRole === 'SUPERADMIN') {
    return RoleName.ADMIN;
  }
  if (upperRole === 'MANAGER' || upperRole === 'INVENTORY_MANAGER' || upperRole === 'INVENTORYMANAGER') {
    return RoleName.MANAGER;
  }
  if (upperRole === 'SUPPORT_STAFF' || upperRole === 'SUPPORT_AGENT' || upperRole === 'SUPPORTAGENT') {
    return RoleName.SUPPORT_STAFF;
  }
  if (upperRole === 'WORKING_PROFESSIONAL' || upperRole === 'WORKINGPROFESSIONAL') {
    return RoleName.WORKING_PROFESSIONAL;
  }
  return RoleName.CUSTOMER;
}

/**
 * Check if a route is public (doesn't require authentication)
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.includes('[')) {
      // Convert dynamic route pattern to regex
      const pattern = route.replace(/\[.*?\]/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(path);
    }
    return route === path;
  });
}

/**
 * Check if a route is an admin route
 */
export function isAdminRoute(path: string): boolean {
  return path.startsWith('/admin');
}

/**
 * Get the route configuration for a given path
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  // Check admin routes first
  const adminRoute = ADMIN_ROUTES.find(route => {
    const pattern = route.path.replace(/\[.*?\]/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(path);
  });
  if (adminRoute) return adminRoute;

  // Check customer routes
  const customerRoute = CUSTOMER_ROUTES.find(route => {
    const pattern = route.path.replace(/\[.*?\]/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(path);
  });
  if (customerRoute) return customerRoute;

  return undefined;
}

/**
 * Check if a user has permission to access a route
 */
export function canAccessRoute(
  role: RoleName | string | undefined,
  path: string
): { allowed: boolean; redirectTo?: string } {
  // If not authenticated
  if (!role) {
    return { allowed: false, redirectTo: '/login' };
  }

  const normalizedRole = normalizeRoleName(role);

  // Check if it's a public route
  if (isPublicRoute(path)) {
    return { allowed: true };
  }

  // Get route configuration
  const routeConfig = getRouteConfig(path);
  
  if (!routeConfig) {
    // No specific config, allow if authenticated
    return { allowed: true };
  }

  // Check role-based access
  if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
    if (!routeConfig.allowedRoles.includes(normalizedRole)) {
      return { 
        allowed: false, 
        redirectTo: getDefaultRouteForRole(normalizedRole) 
      };
    }
  }

  // Check permission-based access
  if (routeConfig.requiredPermissions) {
    for (const perm of routeConfig.requiredPermissions) {
      if (!hasPermission(normalizedRole, perm.feature, perm.level)) {
        return { 
          allowed: false, 
          redirectTo: getDefaultRouteForRole(normalizedRole) 
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Check if user can access admin routes
 */
export function canAccessAdmin(role: RoleName | string | undefined): boolean {
  if (!role) return false;
  
  const normalizedRole = normalizeRoleName(role);
  return [RoleName.ADMIN, RoleName.MANAGER, RoleName.SUPPORT_STAFF].includes(normalizedRole);
}

/**
 * Get navigation items for a specific role
 */
export function getNavItemsForRole(role: RoleName | string | undefined): NavItem[] {
  if (!role) return [];

  const normalizedRole = normalizeRoleName(role);
  
  // Admin navigation items
  if (canAccessAdmin(normalizedRole)) {
    return [
      {
        label: 'Dashboard',
        path: '/admin/dashboard',
        icon: '▣',
        roles: [RoleName.ADMIN, RoleName.MANAGER, RoleName.SUPPORT_STAFF],
      },
      {
        label: 'Orders',
        path: '/admin/orders',
        icon: '◱',
        roles: [RoleName.ADMIN, RoleName.SUPPORT_STAFF],
        permissions: [{ feature: Feature.ORDERS, level: PermissionLevel.READ }],
      },
      {
        label: 'Products',
        path: '/admin/products',
        icon: '◆',
        roles: [RoleName.ADMIN, RoleName.MANAGER],
        permissions: [{ feature: Feature.PRODUCTS, level: PermissionLevel.READ }],
      },
      {
        label: 'Inventory',
        path: '/admin/inventory',
        icon: '○',
        roles: [RoleName.ADMIN, RoleName.MANAGER],
        permissions: [{ feature: Feature.INVENTORY, level: PermissionLevel.READ }],
      },
      {
        label: 'Returns',
        path: '/admin/returns',
        icon: '↺',
        roles: [RoleName.ADMIN, RoleName.MANAGER, RoleName.SUPPORT_STAFF],
        permissions: [{ feature: Feature.RETURNS, level: PermissionLevel.READ }],
      },
      {
        label: 'Support',
        path: '/admin/support',
        icon: '◎',
        roles: [RoleName.ADMIN, RoleName.SUPPORT_STAFF],
        permissions: [{ feature: Feature.SUPPORT, level: PermissionLevel.READ }],
      },
      {
        label: 'Collections',
        path: '/admin/collections',
        icon: '▦',
        roles: [RoleName.ADMIN, RoleName.MANAGER],
        permissions: [{ feature: Feature.COLLECTIONS, level: PermissionLevel.READ }],
      },
      {
        label: 'Categories',
        path: '/admin/categories',
        icon: '⊞',
        roles: [RoleName.ADMIN, RoleName.MANAGER],
        permissions: [{ feature: Feature.CATEGORIES, level: PermissionLevel.READ }],
      },
      {
        label: 'Coupons',
        path: '/admin/coupons',
        icon: '◈',
        roles: [RoleName.ADMIN],
        permissions: [{ feature: Feature.COUPONS, level: PermissionLevel.READ }],
      },
      {
        label: 'Content',
        path: '/admin/pages',
        icon: '▤',
        roles: [RoleName.ADMIN],
        permissions: [{ feature: Feature.CONTENT, level: PermissionLevel.READ }],
      },
      {
        label: 'Users',
        path: '/admin/users',
        icon: '◉',
        roles: [RoleName.ADMIN],
        permissions: [{ feature: Feature.USERS, level: PermissionLevel.READ }],
      },
      {
        label: 'Settings',
        path: '/admin/config',
        icon: '◌',
        roles: [RoleName.ADMIN],
        permissions: [{ feature: Feature.SETTINGS, level: PermissionLevel.READ }],
      },
    ].filter(item => item.roles.includes(normalizedRole));
  }

  // Customer navigation items
  return [
    {
      label: 'My Account',
      path: '/account',
      icon: '👤',
      roles: [RoleName.CUSTOMER, RoleName.WORKING_PROFESSIONAL],
    },
    {
      label: 'My Orders',
      path: '/account/orders',
      icon: '📦',
      roles: [RoleName.CUSTOMER, RoleName.WORKING_PROFESSIONAL],
    },
    {
      label: 'Wishlist',
      path: '/account/wishlist',
      icon: '♡',
      roles: [RoleName.CUSTOMER, RoleName.WORKING_PROFESSIONAL],
    },
    {
      label: 'Addresses',
      path: '/account/addresses',
      icon: '📍',
      roles: [RoleName.CUSTOMER, RoleName.WORKING_PROFESSIONAL],
    },
  ].filter(item => item.roles.includes(normalizedRole));
}

// ============================================================================
// Constants Export
// ============================================================================

/**
 * Authentication error codes
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_REQUIRED: 'ROLE_REQUIRED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Frontend session timeout in milliseconds.
 * Must match (or be slightly less than) the JWT access token TTL in cache.ts.
 *
 * DEV NOTE: Admin is set to 7 days to match the dev JWT TTL.
 * ⚠️  Reduce ADMIN to 60 * 60 * 1000 (1h) before deploying to production.
 */
export const SESSION_TIMEOUT_MS = {
  [RoleName.ADMIN]: 7 * 24 * 60 * 60 * 1000,           // 7 days — DEV ONLY
  [RoleName.MANAGER]: 60 * 60 * 1000,                   // 1 hour
  [RoleName.SUPPORT_STAFF]: 60 * 60 * 1000,             // 1 hour
  [RoleName.WORKING_PROFESSIONAL]: 24 * 60 * 60 * 1000, // 24 hours
  [RoleName.CUSTOMER]: 24 * 60 * 60 * 1000,             // 24 hours (matches JWT access token)
} as const;

/**
 * Get session timeout for a role
 */
export function getSessionTimeout(role: RoleName | string | undefined): number {
  if (!role) return SESSION_TIMEOUT_MS[RoleName.CUSTOMER];
  const normalizedRole = normalizeRoleName(role);
  return SESSION_TIMEOUT_MS[normalizedRole] || SESSION_TIMEOUT_MS[RoleName.CUSTOMER];
}

