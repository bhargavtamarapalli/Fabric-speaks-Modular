/**
 * Caching Configuration for Role-Based Access Control
 * 
 * This module defines cache TTL (Time To Live) configurations for each role,
 * along with cache invalidation triggers and session caching strategies.
 * 
 * Role-based caching strategy:
 * - WORKING_PROFESSIONAL: 5 min - Frequent access, moderate security needs
 * - MANAGER: 10 min - Less frequent but higher privileges
 * - ADMIN: 15 min - Highest privileges, longest cache for performance
 * - SUPPORT_STAFF: 5 min - Customer interaction role, needs fresh data
 * - CUSTOMER: 60 min - Basic access, longest cache (30-day tokens)
 */

import { Role } from '../types';
import { RoleName } from './permissions';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CacheConfig {
  ttlSeconds: number;
  staleWhileRevalidate?: number;
  maxSize?: number;
}

export interface CacheInvalidationTrigger {
  event: CacheInvalidationEvent;
  description: string;
}

export enum CacheInvalidationEvent {
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ROLE_CHANGED = 'user.role_changed',
  USER_PROFILE_UPDATED = 'user.profile_updated',
  
  // Session events
  SESSION_CREATED = 'session.created',
  SESSION_EXPIRED = 'session.expired',
  SESSION_REVOKED = 'session.revoked',
  TOKEN_REFRESHED = 'token.refreshed',
  
  // Permission events
  PERMISSION_CHANGED = 'permission.changed',
  ROLE_PERMISSIONS_UPDATED = 'role.permissions_updated',
  
  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  
  // Return events
  RETURN_STATUS_CHANGED = 'return.status_changed',
  
  // Product events
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  
  // Inventory events
  INVENTORY_UPDATED = 'inventory.updated',
  LOW_STOCK_ALERT = 'inventory.low_stock',
}

export interface SessionCacheData {
  userId: string;
  role: RoleName;
  email?: string;
  name?: string;
  permissions: string[];
  sessionVersion: number;
  createdAt: number;
  expiresAt: number;
}

// ============================================================================
// Role-Based Cache TTL Configuration
// ============================================================================

/**
 * Cache TTL (Time To Live) in seconds for each role
 * 
 * Values:
 * - WORKING_PROFESSIONAL: 5 minutes (300 seconds)
 * - MANAGER: 10 minutes (600 seconds)
 * - ADMIN: 15 minutes (900 seconds)
 * - SUPPORT_STAFF: 5 minutes (300 seconds)
 * - CUSTOMER: 60 minutes (3600 seconds) - Basic caching for 30-day tokens
 */
export const ROLE_CACHE_TTL: Record<RoleName, number> = {
  WORKING_PROFESSIONAL: 300,    // 5 minutes
  MANAGER: 600,                  // 10 minutes
  ADMIN: 900,                    // 15 minutes
  SUPPORT_STAFF: 300,            // 5 minutes
  CUSTOMER: 3600,                // 60 minutes (1 hour)
};

/**
 * Extended cache configuration with additional options
 */
export const ROLE_CACHE_CONFIG: Record<RoleName, CacheConfig> = {
  WORKING_PROFESSIONAL: {
    ttlSeconds: 300,
    staleWhileRevalidate: 60, // Allow stale data for 1 min while revalidating
    maxSize: 1000,
  },
  MANAGER: {
    ttlSeconds: 600,
    staleWhileRevalidate: 120,
    maxSize: 500,
  },
  ADMIN: {
    ttlSeconds: 900,
    staleWhileRevalidate: 180,
    maxSize: 200,
  },
  SUPPORT_STAFF: {
    ttlSeconds: 300,
    staleWhileRevalidate: 60,
    maxSize: 1000,
  },
  CUSTOMER: {
    ttlSeconds: 3600,
    staleWhileRevalidate: 300,
    maxSize: 5000,
  },
};

// ============================================================================
// Token Expiry Configuration (in minutes)
// ============================================================================

/**
 * JWT Access token expiry based on role (in minutes).
 *
 * DEVELOPMENT NOTE: Admin TTL is intentionally set to 7 days here
 * to avoid repeated re-logins during local development.
 * ⚠️  Reduce ADMIN to 60 minutes before deploying to production.
 */
export const ROLE_TOKEN_EXPIRY: Record<RoleName, number> = {
  WORKING_PROFESSIONAL: 60,     // 60 minutes
  MANAGER: 60,                   // 60 minutes
  ADMIN: 10080,                  // 7 days — DEV ONLY (set to 60 for prod)
  SUPPORT_STAFF: 60,             // 60 minutes
  CUSTOMER: 1440,                // 24 hours access token (long-lived session via refresh)
};

/**
 * Refresh token expiry in days.
 * Customer: 30 days rolling session.
 * Admin: 7 days shorter window for security.
 */
export const ROLE_REFRESH_TOKEN_EXPIRY_DAYS: Record<RoleName, number> = {
  WORKING_PROFESSIONAL: 30,
  MANAGER: 30,
  ADMIN: 7,                      // 7-day refresh for admin security
  SUPPORT_STAFF: 30,
  CUSTOMER: 30,                  // 30-day refresh token for customers
};

// ============================================================================
// Cache Key Prefixes
// ============================================================================

export const CACHE_KEYS = {
  SESSION: 'session:',
  USER: 'user:',
  PERMISSIONS: 'permissions:',
  ROLE: 'role:',
  TOKEN: 'token:',
  REFRESH_TOKEN: 'refresh:',
  OTP: 'otp:',
} as const;

// ============================================================================
// Cache Invalidation Triggers
// ============================================================================

/**
 * Cache invalidation triggers for each role
 * These events should trigger cache invalidation when they occur
 */
export const ROLE_INVALIDATION_TRIGGERS: Record<RoleName, CacheInvalidationTrigger[]> = {
  WORKING_PROFESSIONAL: [
    { event: CacheInvalidationEvent.USER_ROLE_CHANGED, description: 'Role change requires new permissions' },
    { event: CacheInvalidationEvent.PERMISSION_CHANGED, description: 'Permission update affects access' },
    { event: CacheInvalidationEvent.SESSION_REVOKED, description: 'Session was revoked' },
    { event: CacheInvalidationEvent.TOKEN_REFRESHED, description: 'Token refresh updates session version' },
  ],
  MANAGER: [
    { event: CacheInvalidationEvent.USER_ROLE_CHANGED, description: 'Role change requires new permissions' },
    { event: CacheInvalidationEvent.PERMISSION_CHANGED, description: 'Permission update affects access' },
    { event: CacheInvalidationEvent.SESSION_REVOKED, description: 'Session was revoked' },
    { event: CacheInvalidationEvent.ORDER_UPDATED, description: 'Order changes may affect manager view' },
    { event: CacheInvalidationEvent.INVENTORY_UPDATED, description: 'Inventory changes for oversight' },
  ],
  ADMIN: [
    { event: CacheInvalidationEvent.USER_ROLE_CHANGED, description: 'Role change requires new permissions' },
    { event: CacheInvalidationEvent.PERMISSION_CHANGED, description: 'Permission update affects access' },
    { event: CacheInvalidationEvent.SESSION_REVOKED, description: 'Session was revoked' },
    { event: CacheInvalidationEvent.USER_CREATED, description: 'New user added to system' },
    { event: CacheInvalidationEvent.USER_DELETED, description: 'User removed from system' },
    { event: CacheInvalidationEvent.ORDER_CREATED, description: 'New order in system' },
    { event: CacheInvalidationEvent.PRODUCT_CREATED, description: 'New product added' },
    { event: CacheInvalidationEvent.PRODUCT_DELETED, description: 'Product removed' },
  ],
  SUPPORT_STAFF: [
    { event: CacheInvalidationEvent.USER_ROLE_CHANGED, description: 'Role change requires new permissions' },
    { event: CacheInvalidationEvent.PERMISSION_CHANGED, description: 'Permission update affects access' },
    { event: CacheInvalidationEvent.SESSION_REVOKED, description: 'Session was revoked' },
    { event: CacheInvalidationEvent.ORDER_UPDATED, description: 'Order status may affect customer query' },
    { event: CacheInvalidationEvent.RETURN_STATUS_CHANGED, description: 'Return status change' },
  ],
  CUSTOMER: [
    { event: CacheInvalidationEvent.USER_PROFILE_UPDATED, description: 'Profile data changed' },
    { event: CacheInvalidationEvent.SESSION_REVOKED, description: 'Session was revoked' },
    { event: CacheInvalidationEvent.TOKEN_REFRESHED, description: 'Token refresh updates session version' },
    { event: CacheInvalidationEvent.ORDER_UPDATED, description: 'Order status change' },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get cache TTL for a role
 */
export function getCacheTTL(roleName: RoleName): number {
  return ROLE_CACHE_TTL[roleName] || 300; // Default to 5 minutes
}

/**
 * Get full cache configuration for a role
 */
export function getCacheConfig(roleName: RoleName): CacheConfig {
  return ROLE_CACHE_CONFIG[roleName] || {
    ttlSeconds: 300,
    staleWhileRevalidate: 60,
  };
}

/**
 * Get token expiry in minutes for a role
 */
export function getTokenExpiry(roleName: RoleName): number {
  return ROLE_TOKEN_EXPIRY[roleName] || 30;
}

/**
 * Get refresh token expiry in days for a role
 */
export function getRefreshTokenExpiryDays(roleName: RoleName): number {
  return ROLE_REFRESH_TOKEN_EXPIRY_DAYS[roleName] || 30;
}

/**
 * Generate a session cache key
 */
export function getSessionCacheKey(userId: string): string {
  return `${CACHE_KEYS.SESSION}${userId}`;
}

/**
 * Generate a permissions cache key
 */
export function getPermissionsCacheKey(userId: string): string {
  return `${CACHE_KEYS.PERMISSIONS}${userId}`;
}

/**
 * Convert Role type to RoleName for caching
 */
export function getRoleNameFromRole(role: Role): RoleName {
  const roleNameMap: Record<Role, RoleName> = {
    customer: 'CUSTOMER',
    supportAgent: 'SUPPORT_STAFF',
    inventoryManager: 'MANAGER',
    superAdmin: 'ADMIN',
  };
  
  return roleNameMap[role] || 'CUSTOMER';
}

/**
 * Check if a cache invalidation event should trigger for a specific role
 */
export function shouldInvalidateCache(
  roleName: RoleName,
  event: CacheInvalidationEvent
): boolean {
  const triggers = ROLE_INVALIDATION_TRIGGERS[roleName];
  return triggers.some(trigger => trigger.event === event);
}

/**
 * Get all invalidation events for a role
 */
export function getInvalidationEvents(roleName: RoleName): CacheInvalidationEvent[] {
  const triggers = ROLE_INVALIDATION_TRIGGERS[roleName];
  return triggers.map(trigger => trigger.event);
}
