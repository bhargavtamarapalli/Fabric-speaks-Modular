'use client';

import React from 'react';
import { useLayout } from '@/context/LayoutContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useAuth } from '@/context/AuthContext';
import { THEME } from '@/lib/admin/theme';
import { Search, Bell, Menu, X } from 'lucide-react';

export function TopBar() {
  const { 
    isMobile, 
    toggleSidebar, 
    isMobileSearchOpen, 
    toggleMobileSearch 
  } = useLayout();
  
  const { name: adminName } = useAdminAuth();
  const { user: dbUser } = useAuth();
  
  const userName = adminName || dbUser?.name || 'Admin';
  const firstName = userName.split(' ')[0] || 'Admin';
  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';

  return (
    <header className="sticky top-0 z-[200] bg-[var(--fs-surface)] min-h-[64px] h-16 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--fs-wire)]">
      
      {/* ── Left Section: Mobile Menu Toggle & Title ── */}
      <div className="flex items-center gap-3">
        {/* Tablet / Small Desktop Hamburger */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 text-[var(--fs-ivory)] hover:bg-[var(--fs-surface-2)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--fs-linen)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Welcome Message (Hidden when mobile search is active) */}
        {!isMobileSearchOpen && (
          <div className="flex flex-col justify-center">
            <span className="text-[var(--fs-ivory)] text-sm sm:text-base font-medium truncate max-w-[140px] sm:max-w-xs">
              Good morning, {firstName}
            </span>
            <span className="hidden sm:block text-[var(--fs-ash)] text-xs mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} IST
            </span>
          </div>
        )}
      </div>

      {/* ── Right Section: Search, Notifications, Profile ── */}
      <div className={`flex items-center gap-2 sm:gap-4 transition-all duration-300 ${isMobileSearchOpen ? 'w-full ml-0' : 'w-auto ml-auto'}`}>
        
        {/* Expanded Mobile Search Overlay */}
        {isMobile && isMobileSearchOpen ? (
          <div className="flex-1 relative animate-in fade-in slide-in-from-right-4 duration-300">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fs-ash)] z-10" />
            <input 
              type="text" 
              placeholder="Search orders, users..." 
              autoFocus
              className="w-full bg-[var(--fs-surface-2)] text-[var(--fs-ivory)] placeholder-[var(--fs-ash)] rounded-full py-2 pl-10 pr-10 border border-[var(--fs-wire)] focus:outline-none focus:border-[var(--fs-linen)] focus:ring-1 focus:ring-[var(--fs-linen)] min-h-[40px] text-sm"
            />
            <button 
              onClick={toggleMobileSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--fs-ash)] hover:text-[var(--fs-ivory)]"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Persistent Search */}
            <div className="hidden sm:block relative w-48 lg:w-64 xl:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fs-ash)] z-10" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-[var(--fs-surface-2)] text-[var(--fs-ivory)] placeholder-[var(--fs-ash)] rounded-full py-1.5 pl-10 pr-4 border border-[var(--fs-wire)] focus:outline-none focus:border-[var(--fs-linen)] focus:ring-1 focus:ring-[var(--fs-linen)] min-h-[36px] text-sm transition-all"
              />
            </div>

            {/* Mobile Search Icon Trigger */}
            <button 
              onClick={toggleMobileSearch}
              className="sm:hidden p-2 text-[var(--fs-ivory)] hover:bg-[var(--fs-surface-2)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--fs-linen)] min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Notifications & Profile (Hidden during mobile search) */}
        {!isMobileSearchOpen && (
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            <button 
              className="relative p-2 text-[var(--fs-ivory)] hover:bg-[var(--fs-surface-2)] rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--fs-linen)]"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 sm:w-5 sm:h-5 text-[var(--fs-ash)]" />
              <span className="absolute top-[8px] right-[10px] sm:top-[10px] sm:right-[12px] w-[6px] h-[6px] bg-[var(--fs-error)] rounded-full shadow-[0_0_0_2px_var(--fs-surface)]" />
            </button>

            <div className="w-9 h-9 sm:w-9 sm:h-9 rounded-full bg-[var(--fs-surface-2)] text-[var(--fs-ivory)] border border-[var(--fs-wire)] flex items-center justify-center text-xs font-semibold uppercase cursor-pointer hover:border-[var(--fs-linen)] transition-colors ml-1">
              {initials}
            </div>
          </div>
        )}
      </div>

    </header>
  );
}
