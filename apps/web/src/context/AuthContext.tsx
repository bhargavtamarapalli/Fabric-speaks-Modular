'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/apiClient';
import { useRouter, usePathname } from 'next/navigation';
import {
  RoleName,
  Feature,
  PermissionLevel,
  hasPermission,
  normalizeRoleName,
  getDefaultRouteForRole,
  getSessionTimeout,
  AUTH_ERRORS
} from '@/lib/routing/config';

/**
 * Extended user type with role and permissions
 */
export interface AuthUser {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  isNewUser?: boolean;
  permissions?: string[];
  sessionExpiresAt?: number;
}

/**
 * Authentication error type
 */
export interface AuthError {
  code: string;
  message: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: AuthError | null;
  role: RoleName | null;
  isAuthenticated: boolean;
  login: (data: { email?: string; password?: string; idToken?: string; returnUrl?: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithOTP: (mobile: string, otp: string) => Promise<void>;
  register: (data: { email: string; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (feature: Feature, level: PermissionLevel) => boolean;
  getDefaultRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Enhanced AuthProvider with role-based routing support
 * 
 * Features:
 * - Automatic role extraction from user data
 * - Permission checking utilities
 * - Session timeout handling
 * - Role-based redirect after login
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [role, setRole] = useState<RoleName | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Get user's role from user data
   */
  const getUserRole = useCallback((userData: AuthUser): RoleName => {
    if (userData.role) {
      return normalizeRoleName(userData.role);
    }
    return RoleName.CUSTOMER;
  }, []);

  /**
   * Calculate session expiration time based on role
   */
  const calculateSessionExpiry = useCallback((userRole: RoleName): number => {
    const timeoutMs = getSessionTimeout(userRole);
    return Date.now() + timeoutMs;
  }, []);

  /**
   * Clear session timer
   */
  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  /**
   * Set up session timeout timer
   */
  const setupSessionTimer = useCallback((userRole: RoleName) => {
    clearSessionTimer();

    const timeoutMs = getSessionTimeout(userRole);
    sessionTimerRef.current = setTimeout(() => {
      // Session expired
      handleSessionExpired();
    }, timeoutMs);
  }, [clearSessionTimer]);

  /**
   * Handle session expiration
   */
  const handleSessionExpired = useCallback(async () => {
    setUser(null);
    setRole(null);
    clearSessionTimer();

    // Do not redirect or show expired error if already on login or register
    if (pathname === '/login' || pathname === '/register') {
      return;
    }

    setError({
      code: AUTH_ERRORS.SESSION_EXPIRED,
      message: 'Your session has expired. Please log in again.',
    });

    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(pathname);
    router.push(`/login?returnUrl=${returnUrl}&expired=true`);
  }, [pathname, router, clearSessionTimer]);

  /**
   * Update last activity timestamp
   */
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    console.log("[AUTH_CONTEXT] refreshUser() called");
    try {
      const data = await apiFetch<AuthUser>('/auth/me');
      console.log("[AUTH_CONTEXT] /auth/me success, got user:", data?.id);

      if (data) {
        const userRole = getUserRole(data);
        const userWithSession = {
          ...data,
          sessionExpiresAt: calculateSessionExpiry(userRole),
        };

        setUser(userWithSession);
        setRole(userRole);
        setError(null);

        // Set up session timer
        setupSessionTimer(userRole);
      } else {
        setUser(null);
        setRole(null);
        clearSessionTimer();
      }
    } catch (err) {
      console.log("[AUTH_CONTEXT] refreshUser() error:", err instanceof ApiError ? err.code : err);
      // Handle specific auth errors
      if (err instanceof ApiError) {
        if (err.code === 'UNAUTHORIZED' || err.code === 'TOKEN_EXPIRED') {
          setUser(null);
          setRole(null);
          clearSessionTimer();
        } else {
          setError({
            code: err.code,
            message: err.message,
          });
        }
      } else {
        setError({
          code: AUTH_ERRORS.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [getUserRole, calculateSessionExpiry, setupSessionTimer, clearSessionTimer]);

  /**
   * Handle successful authentication - redirect to role-appropriate page
   */
  const handleAuthSuccess = useCallback((userData: AuthUser, returnUrl?: string | null) => {
    console.log("[AUTH_CONTEXT] handleAuthSuccess called for user:", userData.id);
    const userRole = getUserRole(userData);

    // Determine redirect URL
    let redirectUrl: string;

    if (returnUrl && returnUrl !== '/login' && returnUrl !== '/register') {
      // If there's a valid return URL, use it
      redirectUrl = returnUrl;
    } else {
      // Otherwise, redirect to role-appropriate default page
      redirectUrl = getDefaultRouteForRole(userRole);
    }

    console.log("[AUTH_CONTEXT] Determined redirectUrl:", redirectUrl);

    // Update state
    const userWithSession: AuthUser = {
      ...userData,
      sessionExpiresAt: calculateSessionExpiry(userRole),
    };

    setUser(userWithSession);
    setRole(userRole);
    setError(null);

    // Set up session timer
    setupSessionTimer(userRole);

    console.log("[AUTH_CONTEXT] Pushing route:", redirectUrl);
    // Redirect
    router.push(redirectUrl);
  }, [getUserRole, calculateSessionExpiry, setupSessionTimer, router]);

  /**
   * Login with email/password
   */
  const login = useCallback(async (data: { email?: string; password?: string; returnUrl?: string }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        data
      });

      await handleAuthSuccess(result.user, data.returnUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS' || err.code === 'UNAUTHORIZED') {
          setError({
            code: AUTH_ERRORS.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          });
        } else {
          setError({
            code: err.code,
            message: err.message,
          });
        }
      } else {
        setError({
          code: AUTH_ERRORS.NETWORK_ERROR,
          message: 'Network error. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthSuccess]);

  /**
   * Login with Google
   */
  const loginWithGoogle = useCallback(async (idToken: string) => {
    console.log("[AUTH_CONTEXT] loginWithGoogle initiated");
    setLoading(true);
    setError(null);

    try {
      console.log("[AUTH_CONTEXT] Fetching /auth/login-google with idToken");
      const result = await apiFetch<{ user: AuthUser }>('/auth/login-google', {
        method: 'POST',
        data: { idToken }
      });

      console.log("[AUTH_CONTEXT] loginWithGoogle API response success:", result.user.id);
      await handleAuthSuccess(result.user);
    } catch (err) {
      console.error("[AUTH_CONTEXT] loginWithGoogle Error:", err);
      if (err instanceof ApiError) {
        setError({
          code: err.code,
          message: err.message || 'Google login failed',
        });
      } else {
        setError({
          code: AUTH_ERRORS.NETWORK_ERROR,
          message: 'Network error. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthSuccess]);

  /**
   * Login with OTP
   */
  const loginWithOTP = useCallback(async (mobile: string, otp: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<{ user: AuthUser }>('/auth/customer/otp-verify', {
        method: 'POST',
        data: { mobile, idToken: otp }
      });

      await handleAuthSuccess(result.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({
          code: err.code,
          message: err.message || 'Invalid verification code',
        });
      } else {
        setError({
          code: AUTH_ERRORS.NETWORK_ERROR,
          message: 'Network error. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthSuccess]);

  /**
   * Register new user
   */
  const register = useCallback(async (data: { email: string; name: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<{ user: AuthUser }>('/auth/register', {
        method: 'POST',
        data
      });

      await handleAuthSuccess(result.user);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ALREADY_EXISTS') {
          setError({
            code: err.code,
            message: 'An account with this email already exists',
          });
        } else {
          setError({
            code: err.code,
            message: err.message,
          });
        }
      } else {
        setError({
          code: AUTH_ERRORS.NETWORK_ERROR,
          message: 'Network error. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthSuccess]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors - clear local state anyway
    } finally {
      setUser(null);
      setRole(null);
      setError(null);
      clearSessionTimer();
      router.push('/login');
    }
  }, [router, clearSessionTimer]);

  /**
   * Check if user has a specific permission
   */
  const checkPermission = useCallback((feature: Feature, level: PermissionLevel): boolean => {
    if (!role) return false;
    return hasPermission(role, feature, level);
  }, [role]);

  /**
   * Get default route for current user
   */
  const getDefaultRoute = useCallback((): string => {
    if (!role) return '/';
    return getDefaultRouteForRole(role);
  }, [role]);

  // Initial user load - Skip on auth pages to avoid re-render loops during login flow
  useEffect(() => {
    if (pathname !== '/login' && pathname !== '/register') {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser, pathname]);

  // Listen for unauthorized events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      handleSessionExpired();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('unauthorized', handleUnauthorized);
      return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }
  }, [handleSessionExpired]);

  // Track user activity for session management
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (user && role) {
        updateActivity();
        // Reset session timer on activity
        setupSessionTimer(role);
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, role, updateActivity, setupSessionTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSessionTimer();
    };
  }, [clearSessionTimer]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    role,
    isAuthenticated: !!user && !!role,
    login,
    loginWithGoogle,
    loginWithOTP,
    register,
    logout,
    refreshUser,
    hasPermission: checkPermission,
    getDefaultRoute,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
