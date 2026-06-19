import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Boxes, 
  RotateCcw, 
  LifeBuoy, 
  Layers, 
  Tags, 
  Ticket, 
  FileText, 
  Users, 
  Settings, 
  Wrench 
} from 'lucide-react';
import type { AdminRole } from '@/lib/admin/types';

// Central configuration for all Admin icons and layout sizes
export const LAYOUT_CONFIG = {
  iconSize: {
    sidebar: 18,
    bottomNav: 22,
  },
  bottomNavHeight: '76px',
  matteBlur: '12px',
  matteOpacity: '0.85',
};

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
  roles: AdminRole[];
  showOnMobile: boolean; // Flag to determine if it shows on the BottomNav
}

// Single source of truth for all navigation
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SUPPORT_AGENT'], showOnMobile: true },
  { id: 'orders', label: 'Orders', path: '/admin/orders', icon: ShoppingBag, badge: 0, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT'], showOnMobile: true },
  { id: 'products', label: 'Products', path: '/admin/products', icon: Package, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'], showOnMobile: true },
  { id: 'users', label: 'Users', path: '/admin/users', icon: Users, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SUPPORT_AGENT'], showOnMobile: true },
  { id: 'settings', label: 'Settings', path: '/admin/config', icon: Settings, roles: ['SUPER_ADMIN'], showOnMobile: true },
  
  // Sidebar Only Items
  { id: 'inventory', label: 'Inventory', path: '/admin/inventory', icon: Boxes, badge: 0, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'], showOnMobile: false },
  { id: 'returns', label: 'Returns', path: '/admin/returns', icon: RotateCcw, badge: 0, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT', 'INVENTORY_MANAGER'], showOnMobile: false },
  { id: 'support', label: 'Support', path: '/admin/support', icon: LifeBuoy, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT'], showOnMobile: false },
  { id: 'collections', label: 'Collections', path: '/admin/collections', icon: Layers, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'], showOnMobile: false },
  { id: 'categories', label: 'Categories', path: '/admin/categories', icon: Tags, roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'], showOnMobile: false },
  { id: 'coupons', label: 'Coupons', path: '/admin/coupons', icon: Ticket, roles: ['SUPER_ADMIN'], showOnMobile: false },
  { id: 'pages', label: 'Content', path: '/admin/pages', icon: FileText, roles: ['SUPER_ADMIN'], showOnMobile: false },
  { id: 'dev', label: 'Dev Tools', path: '/admin/dev/promote-user', icon: Wrench, roles: ['SUPER_ADMIN'], showOnMobile: false },
];
