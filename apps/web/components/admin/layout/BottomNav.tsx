'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLayout } from '@/context/LayoutContext';
import { ADMIN_NAV_ITEMS, LAYOUT_CONFIG } from '@/lib/admin/navigation';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

export function BottomNav() {
  const { isMobile } = useLayout();
  const pathname = usePathname();
  const router = useRouter();
  const { activeRole } = useEffectiveRole();

  // BottomNav only renders on mobile according to requirements
  if (!isMobile) return null;

  // Filter mobile-enabled items and Role-gate them
  const visibleNav = ADMIN_NAV_ITEMS.filter(
    item => item.showOnMobile && (!activeRole || item.roles.includes(activeRole))
  );

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[400] flex justify-around items-center px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] rounded-t-3xl border border-[var(--fs-wire)]/50"
      style={{
        height: LAYOUT_CONFIG.bottomNavHeight,
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Matte Effect
        background: `rgba(17, 17, 17, ${LAYOUT_CONFIG.matteOpacity})`, // THEME.colors.surface equivalent
        backdropFilter: `blur(${LAYOUT_CONFIG.matteBlur})`,
        WebkitBackdropFilter: `blur(${LAYOUT_CONFIG.matteBlur})`,
      }}
    >
      {visibleNav.map((item) => {
        const isActive = pathname.startsWith(item.path);
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1.5 min-w-[44px] min-h-[44px] touch-manipulation transition-colors ${
              isActive ? 'text-[var(--fs-linen)]' : 'text-[var(--fs-ash)] hover:text-[var(--fs-ivory)]'
            }`}
            aria-label={item.label}
          >
            <div className="relative">
              <Icon 
                size={LAYOUT_CONFIG.iconSize.bottomNav} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              {/* Active state indicator dot */}
              {isActive && (
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[var(--fs-linen)] rounded-full shadow-[0_0_8px_var(--fs-linen)]" />
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
