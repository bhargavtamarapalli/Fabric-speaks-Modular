/**
 * Permission Matrix for Role-Based Access Control (RBAC)
 * 
 * This module defines the complete permission matrix for all roles in the system.
 * Each role has specific permissions across different features.
 * 
 * Roles:
 * - WORKING_PROFESSIONAL: Regular authenticated customer with professional account
 * - MANAGER: Middle management with oversight capabilities
 * - ADMIN: Full administrative access to all features
 * - SUPPORT_STAFF: Customer support representatives
 * - CUSTOMER: Basic customer account
 * 
 * Features:
 * - dashboard, orders, products, inventory, returns, support, collections, 
 *   categories, coupons, content, users, settings, checkout, profile, 
 *   addresses, wishlist, track_order
 * 
 * Permission Levels:
 * - CREATE: Can create new resources
 * - READ: Can view resources
 * - UPDATE: Can modify existing resources
 * - DELETE: Can remove resources
 */

import { Role } from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

export enum PermissionLevel {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
}

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

export type RoleName = 'WORKING_PROFESSIONAL' | 'MANAGER' | 'ADMIN' | 'SUPPORT_STAFF' | 'CUSTOMER';

export interface RolePermissions {
    role: RoleName;
    permissions: Record<Feature, PermissionLevel[]>;
}

export interface PermissionCheck {
    hasPermission: boolean;
    role: RoleName;
    feature: Feature;
    requiredLevel: PermissionLevel;
}

// ============================================================================
// Role to Internal Role Mapping
// ============================================================================

/**
 * Maps the internal Role type to our expanded RoleName for permissions
 */
export const roleToRoleName: Record<Role, RoleName> = {
    customer: 'CUSTOMER',
    supportAgent: 'SUPPORT_STAFF',
    inventoryManager: 'MANAGER',
    superAdmin: 'ADMIN',
};

// ============================================================================
// Permission Matrix
// ============================================================================

/**
 * Complete permission matrix defining what each role can do
 */
export const PERMISSION_MATRIX: Record<RoleName, Record<Feature, PermissionLevel[]>> = {
    // ==========================================================================
    // ADMIN - Full access to all features
    // ==========================================================================
    ADMIN: {
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

    // ==========================================================================
    // MANAGER - Limited admin access, focus on operations
    // ==========================================================================
    MANAGER: {
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

    // ==========================================================================
    // SUPPORT_STAFF - Customer support focused
    // ==========================================================================
    SUPPORT_STAFF: {
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

    // ==========================================================================
    // WORKING_PROFESSIONAL - Enhanced customer with business features
    // ==========================================================================
    WORKING_PROFESSIONAL: {
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

    // ==========================================================================
    // CUSTOMER - Basic customer account
    // ==========================================================================
    CUSTOMER: {
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

/**
 * Check permissions and return detailed result
 */
export function checkPermission(
    roleName: RoleName,
    feature: Feature,
    requiredLevel: PermissionLevel
): PermissionCheck {
    return {
        hasPermission: hasPermission(roleName, feature, requiredLevel),
        role: roleName,
        feature,
        requiredLevel,
    };
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(roleName: RoleName): Record<Feature, PermissionLevel[]> {
    return PERMISSION_MATRIX[roleName] || {};
}

/**
 * Get permissions for a specific feature across all roles
 */
export function getFeaturePermissions(feature: Feature): Record<RoleName, PermissionLevel[]> {
    const result = {} as Record<RoleName, PermissionLevel[]>;

    for (const roleName of Object.keys(PERMISSION_MATRIX) as RoleName[]) {
        result[roleName] = PERMISSION_MATRIX[roleName][feature];
    }

    return result;
}

/**
 * Get all available roles
 */
export function getAllRoles(): RoleName[] {
    return ['ADMIN', 'MANAGER', 'SUPPORT_STAFF', 'WORKING_PROFESSIONAL', 'CUSTOMER'];
}

/**
 * Get all available features
 */
export function getAllFeatures(): Feature[] {
    return Object.values(Feature);
}

/**
 * Check if a role can access a feature at all
 */
export function canAccessFeature(roleName: RoleName, feature: Feature): boolean {
    const permissions = PERMISSION_MATRIX[roleName]?.[feature];
    return permissions !== undefined && permissions.length > 0;
}

/**
 * Get the highest permission level a role has for a feature
 */
export function getHighestPermissionLevel(
    roleName: RoleName,
    feature: Feature
): PermissionLevel | null {
    const permissions = PERMISSION_MATRIX[roleName]?.[feature];
    if (!permissions || permissions.length === 0) {
        return null;
    }

    // Permission hierarchy: DELETE > CREATE > UPDATE > READ
    const hierarchy: PermissionLevel[] = [
        PermissionLevel.DELETE,
        PermissionLevel.CREATE,
        PermissionLevel.UPDATE,
        PermissionLevel.READ,
    ];

    for (const level of hierarchy) {
        if (permissions.includes(level)) {
            return level;
        }
    }

    return null;
}
