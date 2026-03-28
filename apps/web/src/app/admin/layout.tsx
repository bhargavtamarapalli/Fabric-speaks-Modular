'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/admin/layout.tsx
// Admin shell — sidebar + topbar. Wraps all admin pages.
// Role gating happens here: non-admin users are redirected.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import { THEME } from '@/lib/admin/theme';
import { ActionButton } from '@/components/admin/shared';
import type { AdminRole } from '@/lib/admin/types';
import { getServiceHealth, getServiceFromAdminPath } from '@/lib/admin/serviceHealth';

// ─── Constants ────────────────────────────────────────────────────────────────

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

/**
 * Converts the ash fallback color to an "r,g,b" string.
 * THEME.colors.ash is "#A5A5A5" -> "165,165,165"
 */
function getAshAsRgb(): string {
  const ash = THEME.colors.ash.replace('#', '');
  return [
    parseInt(ash.slice(0, 2), 16),
    parseInt(ash.slice(2, 4), 16),
    parseInt(ash.slice(4, 6), 16),
  ].join(',');
}

/**
 * Safely parses a hex color string to RGB values.
 * Returns a "r,g,b" string or fallback values if parsing fails.
 */
function parseHexToRgb(hex: string | undefined): string {
  if (!hex) return getAshAsRgb();
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return getAshAsRgb();
  const match = cleanHex.match(/.{2}/g);
  if (!match) return getAshAsRgb();
  const ashHex = THEME.colors.ash.replace('#', '');
  return match.map((h, index) => {
    const parsed = parseInt(h, 16);
    if (isNaN(parsed)) {
      // Each channel falls back to its proper R, G, or B value from ash
      const ashStart = index * 2;
      return parseInt(ashHex.slice(ashStart, ashStart + 2), 16);
    }
    return parsed;
  }).join(',');
}

/**
 * Gets RGBA values for a role with the given alpha.
 */
function getRgbaFromRole(role: AdminRole, alpha: number): string {
  const rgb = parseHexToRgb(ROLE_COLOR[role]);
  return `rgba(${rgb}, ${alpha})`;
}

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
  roles: AdminRole[];
}

/**
 * Navigation items with role-based access control.
 * 
 * Role Permissions Summary:
 * - SUPER_ADMIN: Full access to all modules
 * - INVENTORY_MANAGER: Dashboard, Products, Inventory, Returns, Collections, Categories
 * - SUPPORT_AGENT: Dashboard, Orders, Returns, Support
 * 
 * Permission Rationale:
 * - INVENTORY_MANAGER does NOT have Orders access: Inventory managers handle stock
 *   and product management, not order processing. Order management is handled by
 *   SUPER_ADMIN and SUPPORT_AGENT roles who need to resolve customer issues.
 * - SUPPORT_AGENT has Returns access: To process return requests and refunds.
 * - INVENTORY_MANAGER has Returns access: To manage inventory aspects of returns.
 */
const NAV_ITEMS: NavItem[] = [
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

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < THEME.breakpoints.mobile);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

// ─── Layout Wrapper ───────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}

// ─── Admin Shell ──────────────────────────────────────────────────────────────

import { useEffectiveRole } from '@/hooks/useEffectiveRole';

import { AdminErrorBoundary } from '@/components/AdminErrorBoundary';

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  
  const { 
    activeRole, 
    isSyncing, 
    isLoading, 
    isAuthenticated,
    adminRole
  } = useEffectiveRole();

  const { name: adminName, email: adminEmail } = useAdminAuth();
  const { user: dbUser } = useAuth();
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [serviceDown, setServiceDown] = useState<{ id: string; message?: string } | null>(null);
  const [showServiceCommands, setShowServiceCommands] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);

  const userEmail = adminEmail || dbUser?.email || '';
  const userName = adminName || dbUser?.name || 'Admin';

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      console.log("[AdminShell] Not authenticated, redirecting to login");
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const check = async () => {
      const service = getServiceFromAdminPath(pathname);
      if (!service) {
        if (!cancelled) setServiceDown(null);
        return;
      }

      try {
        const health = await getServiceHealth(service);
        if (health.status === 'down') {
          if (!cancelled) setServiceDown({ id: service, message: health.message });
        } else {
          if (!cancelled) setServiceDown(null);
          if (!cancelled) setShowServiceCommands(false);
        }
      } catch {
        if (!cancelled) setServiceDown({ id: service, message: 'Unreachable' });
      }
    };

    check();
    interval = setInterval(check, 30000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [pathname]);

  const handleNavClick = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const visibleNav = useMemo(() => {
    if (!activeRole) return [];
    return NAV_ITEMS.filter(item => item.roles.includes(activeRole));
  }, [activeRole]);

  const sidebarWidth = useMemo(() =>
    isMobile
      ? (mobileOpen ? '240px' : '0')
      : (collapsed ? '54px' : THEME.layout.sidebarWidth),
    [isMobile, mobileOpen, collapsed]
  );

  if (isLoading) {
    return (
      <div style={{ height: '100vh', background: THEME.colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: THEME.colors.linen, fontFamily: THEME.fonts.display, fontSize: THEME.fontSizes.lg }}>Fabric Speaks</div>
      </div>
    );
  }

  return (
    <AdminErrorBoundary>
      <div style={{
        display: 'flex',
        height: '100vh',
        background: THEME.colors.bg,
        fontFamily: THEME.fonts.ui,
        overflow: 'hidden',
      }}>
      {/* ── Sidebar Overlay (Mobile) ─────────────── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100 }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarWidth,
        position: isMobile ? 'fixed' : 'relative',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 110,
        flexShrink: 0,
        background: THEME.colors.bg,
        borderRight: `1px solid ${THEME.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, transform 0.2s ease',
        overflow: 'hidden',
        boxShadow: isMobile && mobileOpen ? '10px 0 30px rgba(0,0,0,0.5)' : 'none',
      }}>
        {/* Logo */}
        <div style={{
          padding: (collapsed && !isMobile) ? '18px 0' : '18px 16px 14px',
          borderBottom: `1px solid ${THEME.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          {!isMobile && (
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: 'pointer', flexShrink: 0, width: '22px', height: '14px', display: 'flex', flexDirection: 'column', gap: '4px', margin: collapsed ? '0 auto' : '0' }}
            >
              {[0, 1, 2].map(i => <div key={i} style={{ height: '2px', background: THEME.colors.linen, borderRadius: '1px', width: (i === 1) ? '14px' : '22px' }} />)}
            </div>
          )}
          {(!collapsed || isMobile) && (
            <div>
              <div style={{ fontFamily: THEME.fonts.display, color: THEME.colors.linen, fontSize: '13px', letterSpacing: '0.1em' }}>FABRIC SPEAKS</div>
              <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '2px' }}>Admin</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '8px 0', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {visibleNav.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <div
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                title={(collapsed && !isMobile) ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: (collapsed && !isMobile) ? '9px 0' : '9px 16px',
                  justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
                  cursor: 'pointer',
                  color: active ? THEME.colors.linen : THEME.colors.ash,
                  borderLeft: active && (!collapsed || isMobile) ? `2px solid ${THEME.colors.linen}` : '2px solid transparent',
                  background: active ? 'rgba(201,169,110,0.07)' : 'transparent',
                  fontSize: THEME.fontSizes.base,
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '14px', opacity: 0.8, flexShrink: 0 }}>{item.icon}</span>
                {(!collapsed || isMobile) && <span style={{ flex: 1 }}>{item.label}</span>}
                {(!collapsed || isMobile) && item.badge !== undefined && item.badge > 0 && (
                  <span style={{ background: THEME.colors.error, color: THEME.colors.ivory, fontSize: '10px', padding: '1px 5px', borderRadius: '8px', fontWeight: 600 }}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {(!collapsed || isMobile) && activeRole && (
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
              {ROLE_NAME[activeRole]}
            </span>
            <button
              onClick={() => router.push('/admin/profile')}
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

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: THEME.colors.surface }}>
        {/* Topbar */}
        <div style={{
          height: THEME.layout.topbarHeight,
          borderBottom: `1px solid ${THEME.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 20px',
          flexShrink: 0,
          background: THEME.colors.surface,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                style={{ background: 'none', border: 'none', color: THEME.colors.linen, fontSize: '20px', cursor: 'pointer', padding: '4px' }}
              >
                ☰
              </button>
            )}
            <div>
              <div style={{ color: THEME.colors.ivory, fontSize: isMobile ? THEME.fontSizes.sm : THEME.fontSizes.base }}>
                Good morning, {userName.split(' ')[0] || 'Admin'}
              </div>
              {!isMobile && (
                <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, marginTop: '1px' }}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} IST
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification dot */}
            <div style={{ position: 'relative', width: '28px', height: '28px', background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <div style={{ color: THEME.colors.ash, fontSize: '13px' }}>◎</div>
              <div style={{ position: 'absolute', top: '2px', right: '2px', width: '7px', height: '7px', background: THEME.colors.error, borderRadius: '50%', border: `1px solid ${THEME.colors.surface}` }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '12px' : THEME.layout.contentPadding
        }}>
          {serviceDown && (
            <div style={{
              marginBottom: THEME.spacing.md,
              padding: THEME.spacing.md,
              borderRadius: THEME.radius.md,
              border: `1px solid ${THEME.colors.error}`,
              background: 'rgba(223, 95, 95, 0.08)',
              color: THEME.colors.ivory,
              display: 'grid',
              gap: THEME.spacing.xs,
            }}>
              <div style={{ fontSize: THEME.fontSizes.base, fontWeight: 600 }}>
                {serviceDown.id.toUpperCase()} service is not running
              </div>
              <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted }}>
                {serviceDown.message ? `Reason: ${serviceDown.message}` : 'This page depends on a service that is offline.'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: THEME.spacing.sm, alignItems: 'center' }}>
                <ActionButton
                  variant="ghost"
                  onClick={() => setShowServiceCommands((prev) => !prev)}
                >
                  {showServiceCommands ? 'Hide start commands' : 'Start required services'}
                </ActionButton>
                {showServiceCommands && (
                  <ActionButton
                    variant="ghost"
                    onClick={async () => {
                      const cmds = getRequiredServiceCommands(pathname).join('\n');
                      try {
                        await navigator.clipboard.writeText(cmds);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        setCopied(false);
                      }
                    }}
                  >
                    {copied ? 'Copied' : 'Copy commands'}
                  </ActionButton>
                )}
              </div>

              {showServiceCommands && (
                <div style={{
                  marginTop: THEME.spacing.xs,
                  display: 'grid',
                  gap: THEME.spacing.xs,
                  fontFamily: THEME.fonts.mono,
                  fontSize: THEME.fontSizes.xs,
                  color: THEME.colors.linen,
                }}>
                  {getRequiredServiceCommands(pathname).map((cmd) => (
                    <div key={cmd} style={{ wordBreak: 'break-word' }}>{cmd}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
    </AdminErrorBoundary>
  );
}

function getStartCommand(serviceId: string) {
  switch (serviceId) {
    case 'gateway':
      return 'npm run dev:gateway';
    case 'auth':
      return 'npm --workspaces=false --prefix services/auth-service run dev';
    case 'admin':
      return 'npm run dev:admin';
    case 'catalog':
      return 'npm --workspaces=false --prefix services/catalog-service run dev';
    case 'order':
      return 'npm --workspaces=false --prefix services/order-service run dev';
    case 'inventory':
      return 'npm --workspaces=false --prefix services/inventory-service run dev';
    case 'returns':
      return 'npm --workspaces=false --prefix services/return-service run dev';
    case 'support':
      return 'npm --workspaces=false --prefix services/support-service run dev';
    default:
      return 'npm run dev:services';
  }
}

function getRequiredServiceCommands(pathname: string) {
  const required = new Set<string>();
  required.add('gateway');
  required.add('auth');

  const pageService = getServiceFromAdminPath(pathname);
  if (pageService) required.add(pageService);

  return Array.from(required).map((svc) => getStartCommand(svc));
}
