'use client';

/**
 * Admin User Store — Memory-only
 * Stores admin user data in React state, never persists to sessionStorage or localStorage
 * This prevents PII from being accessible via DevTools
 */

import { create } from 'zustand';

export interface AdminUser {
  id: string;
  email?: string;
  name?: string;
  mobile?: string;
  role?: 'superAdmin' | 'admin' | 'supportAgent';
}

interface AdminStore {
  adminUser: AdminUser | null;
  setAdminUser: (user: AdminUser | null) => void;
  clearAdminUser: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  adminUser: null,
  
  setAdminUser: (user: AdminUser | null) => {
    set({ adminUser: user });
  },
  
  clearAdminUser: () => {
    set({ adminUser: null });
  },
}));
