'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLayout } from '@/context/LayoutContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useAuth } from '@/context/AuthContext';
import { THEME } from '@/lib/admin/theme';
import type { AdminRole } from '@/lib/admin/types';

const ROLE_NAME: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  INVENTORY_MANAGER: 'Inventory Mgr',
  SUPPORT_AGENT: 'Support Agent',
};

const ROLE_COLOR: Record<AdminRole, string> = {
  SUPER_ADMIN: THEME.colors.linen,
  INVENTORY_MANAGER: THEME.colors.info,
  SUPPORT_AGENT: THEME.colors.success,
};

function parseHexToRgb(hex: string | undefined): string {
  if (!hex) return '165,165,165';
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return '165,165,165';
  const match = cleanHex.match(/.{2}/g);
  if (!match) return '165,165,165';
  return match.map((h) => parseInt(h, 16)).join(',');
}

function getRgbaFromRole(role: AdminRole, alpha: number): string {
  const rgb = parseHexToRgb(ROLE_COLOR[role]);
  return `rgba(${rgb}, ${alpha})`;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: '▣', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SUPPORT_AGENT'] },
  { label: 'Orders', path: '/admin/orders', icon: '◱', badge: 0, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT'] },
  { label: 'Products', path: '/admin/products', icon: '◆', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Inventory', path: '/admin/inventory', icon: '○', badge: 0, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Returns', path: '/admin/returns', icon: '↺', badge: 0, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT', 'INVENTORY_MANAGER'] },
  { label: 'Support', path: '/admin/support', icon: '◎', roles: ['SUPER_ADMIN', 'SUPPORT_AGENT'] },
  { label: 'Collections', path: '/admin/collections', icon: '▦', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Categories', path: '/admin/categories', icon: '⊞', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Coupons', path: '/admin/coupons', icon: '◈', roles: ['SUPER_ADMIN'] },
  { label: 'Content', path: '/admin/pages', icon: '▤', roles: ['SUPER_ADMIN'] },
  { label: 'Users', path: '/admin/users', icon: '◉', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SUPPORT_AGENT'] },
  { label: 'Settings', path: '/admin/config', icon: '◌', roles: ['SUPER_ADMIN'] },
  { label: 'Dev Tools', path: '/admin/dev/promote-user', icon: '⚙', roles: ['SUPER_ADMIN'] },
];

export function Sidebar() {
  const { 
    isMobile, 
    isTablet,
    isDesktop,
    isSidebarOpen, 
    closeSidebar, 
    isSidebarCollapsed, 
    toggleSidebarCollapsed 
  } = useLayout();
  
  const pathname = usePathname();
  const router = useRouter();
  
  const { activeRole } = useEffectiveRole();
  const { name: adminName, email: adminEmail } = useAdminAuth();
  const { user: dbUser } = useAuth();
  
  const userEmail = adminEmail || dbUser?.email || '';

  const visibleNav = useMemo(() => {
    if (!activeRole) return [];
    return NAV_ITEMS.filter(item => item.roles.includes(activeRole));
  }, [activeRole]);

  // Completely hide on mobile
  if (isMobile) return null;

  const isDrawerOpen = isTablet && isSidebarOpen;
  
  // Keep original visual logic to ensure PC remains 100% identical to the earlier design
  // but wrap in Tailwind logic for responsiveness.
  const asideWidthStyles = isTablet 
    ? (isDrawerOpen ? "w-[210px] translate-x-0" : "w-[210px] -translate-x-full lg:translate-x-0") 
    : (isSidebarCollapsed ? "w-[54px]" : "w-[210px]");

  const collapsed = (isSidebarCollapsed && isDesktop);

  return (
    <>
      {isTablet && isSidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100 }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed lg:relative flex-shrink-0 flex flex-col transition-all duration-200 ease-in-out ${asideWidthStyles}`}
        style={{
          zIndex: 110,
          background: THEME.colors.bg,
          borderRight: `1px solid ${THEME.colors.border}`,
          height: '100dvh',
          boxShadow: isTablet && isDrawerOpen ? '10px 0 30px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Header / Logo Match Exact Original */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 16px 14px',
          borderBottom: `1px solid ${THEME.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          {isDesktop && (
            <div
              onClick={toggleSidebarCollapsed}
              style={{ cursor: 'pointer', flexShrink: 0, width: '22px', height: '14px', display: 'flex', flexDirection: 'column', gap: '4px', margin: collapsed ? '0 auto' : '0' }}
            >
              {[0, 1, 2].map(i => <div key={i} style={{ height: '2px', background: THEME.colors.linen, borderRadius: '1px', width: (i === 1) ? '14px' : '22px' }} />)}
            </div>
          )}
          
          {(!collapsed || isTablet) && (
            <div>
              <div style={{ fontFamily: THEME.fonts.display, color: THEME.colors.linen, fontSize: '13px', letterSpacing: '0.1em' }}>FABRIC SPEAKS</div>
              <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '2px' }}>Admin</div>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '8px 0', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {visibleNav.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <div
                key={item.path}
                onClick={() => {
                  router.push(item.path);
                  if (isTablet) closeSidebar();
                }}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: collapsed ? '9px 0' : '9px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  cursor: 'pointer',
                  color: active ? THEME.colors.linen : THEME.colors.ash,
                  borderLeft: active && (!collapsed || isTablet) ? `2px solid ${THEME.colors.linen}` : '2px solid transparent',
                  background: active ? 'rgba(201,169,110,0.07)' : 'transparent',
                  fontSize: THEME.fontSizes.base,
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '14px', opacity: 0.8, flexShrink: 0 }}>{item.icon}</span>
                {(!collapsed || isTablet) && <span style={{ flex: 1 }}>{item.label}</span>}
                {(!collapsed || isTablet) && item.badge !== undefined && item.badge > 0 && (
                  <span style={{ background: THEME.colors.error, color: THEME.colors.ivory, fontSize: '10px', padding: '1px 5px', borderRadius: '8px', fontWeight: 600 }}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {(!collapsed || isTablet) && activeRole && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${THEME.colors.border}` }}>
            <div style={{ fontSize: '10.5px', color: THEME.colors.muted }}>Signed in as</div>
            <div style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.linen, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            <span style={{
              display: 'inline-block',
              marginTop: '5px',
              background: getRgbaFromRole(activeRole, 0.1),
              border: `1px solid ${getRgbaFromRole(activeRole, 0.2)}`,
              color: ROLE_COLOR[activeRole],
              fontSize: THEME.fontSizes.xs,
              padding: '2px 8px',
              borderRadius: THEME.radius.sm,
              letterSpacing: '0.05em',
            }}>
              {ROLE_NAME[activeRole as AdminRole]}
            </span>
            <button
              onClick={() => {
                router.push('/admin/profile');
                if (isTablet) closeSidebar();
              }}
              style={{
                marginTop: '8px',
                display: 'block',
                background: 'none',
                border: 'none',
                padding: 0,
                color: THEME.colors.linen,
                fontSize: THEME.fontSizes.xs,
                fontFamily: THEME.fonts.ui,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Manage profile
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
