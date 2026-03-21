'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingBag, Package, RefreshCcw, 
  Activity, Tag, Layers, Ticket, Monitor, FileText, 
  Users, Headset, LogOut 
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import type { AdminRole } from '@/lib/admin/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AdminRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SUPPORT_AGENT'] },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT'] },
  { label: 'Products', href: '/admin/products', icon: Package, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Inventory', href: '/admin/inventory', icon: Layers, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Stock Health', href: '/admin/inventory/health', icon: Activity, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Returns', href: '/admin/returns', icon: RefreshCcw, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT', 'INVENTORY_MANAGER'] },
  { label: 'Categories', href: '/admin/categories', icon: Tag, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Collections', href: '/admin/collections', icon: Layers, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Coupons', href: '/admin/coupons', icon: Ticket, roles: ['SUPER_ADMIN'] },
  { label: 'Store Config', href: '/admin/config', icon: Monitor, roles: ['SUPER_ADMIN'] },
  { label: 'Pages', href: '/admin/pages', icon: FileText, roles: ['SUPER_ADMIN'] },
  { label: 'Admin Users', href: '/admin/users', icon: Users, roles: ['SUPER_ADMIN'] },
  { label: 'Support Queue', href: '/admin/support', icon: Headset, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT'] },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  if (!user || !user.role) return null;

  const allowedItems = NAV_ITEMS.filter(item => item.roles.includes(user.role as AdminRole));

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col h-full sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-medium tracking-widest text-[var(--fs-linen)] uppercase">Fabric Speaks</h1>
        <div className="mt-2 text-xs text-gray-400 font-mono">Panel • {user.role}</div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {allowedItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm ${
                    isActive 
                      ? 'bg-gray-800 text-[var(--fs-linen)]' 
                      : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-400 hover:bg-red-950/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};
