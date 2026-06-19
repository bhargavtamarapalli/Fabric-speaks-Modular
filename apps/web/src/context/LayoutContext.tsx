'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface LayoutContextType {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  isSidebarOpen: boolean; 
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;

  isSidebarCollapsed: boolean; // For desktop icon-only mode
  toggleSidebarCollapsed: () => void;
  
  isMobileSearchOpen: boolean;
  toggleMobileSearch: () => void;
  closeMobileSearch: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let newBp: Breakpoint = 'desktop';
      if (width <= 768) newBp = 'mobile';
      else if (width <= 1024) newBp = 'tablet';
      
      setBreakpoint(newBp);
      
      // Auto-adjust states based on breakpoint
      if (newBp === 'desktop') {
        setIsSidebarOpen(false);
        setIsMobileSearchOpen(false);
      } else if (newBp === 'mobile') {
        setIsSidebarOpen(false);
        setIsSidebarCollapsed(false);
      } else if (newBp === 'tablet') {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openSidebar = () => setIsSidebarOpen(true);

  const toggleSidebarCollapsed = () => setIsSidebarCollapsed(prev => !prev);

  const toggleMobileSearch = () => setIsMobileSearchOpen(prev => !prev);
  const closeMobileSearch = () => setIsMobileSearchOpen(false);

  return (
    <LayoutContext.Provider
      value={{
        breakpoint,
        isMobile,
        isTablet,
        isDesktop,
        isSidebarOpen,
        toggleSidebar,
        closeSidebar,
        openSidebar,
        isSidebarCollapsed,
        toggleSidebarCollapsed,
        isMobileSearchOpen,
        toggleMobileSearch,
        closeMobileSearch,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
