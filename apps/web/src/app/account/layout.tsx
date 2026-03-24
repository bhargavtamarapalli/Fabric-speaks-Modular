'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AccountGuard } from '@/components/account/AccountGuard';
import { useAuth } from '@/context/AuthContext';
import { User, MapPin, Bell, LogOut, Heart, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const ACCOUNT_NAV = [
  { label: 'Profile', href: '/account/profile', icon: User },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
  { label: 'Notifications', href: '/account/notifications', icon: Bell },
  { label: 'Delete Account', href: '/account/delete', icon: AlertTriangle, danger: true },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <AccountGuard>
      <div className="min-h-screen bg-[var(--fs-void)] text-gray-100 font-sans pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Account Sidebar */}
          <aside className="md:col-span-1 space-y-6">
            <div>
              <h1 className="text-2xl font-serif text-[var(--fs-linen)]">My Account</h1>
              <p className="text-sm text-gray-400 mt-1">Manage your details & preferences</p>
            </div>
            
            <nav className="space-y-1">
              {ACCOUNT_NAV.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors text-sm font-medium ${
                      isActive 
                        ? 'bg-[var(--fs-surface)] text-[var(--fs-linen)] border-l-2 border-[var(--fs-linen)]' 
                        : item.danger 
                          ? 'text-red-400 hover:bg-red-950/20'
                          : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button 
              onClick={() => logout()}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-sm text-sm text-gray-400 hover:text-gray-200 transition-colors uppercase tracking-[0.15em]"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </aside>

          {/* Page Content with Global Curtain Wipe */}
          <motion.main 
            className="md:col-span-3 bg-[var(--fs-surface)] rounded p-6 md:p-8 border border-[var(--fs-wire)]"
            initial={{ clipPath: 'inset(100% 0 0 0)' }}
            animate={{ clipPath: 'inset(0% 0 0 0)' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            {children}
          </motion.main>

        </div>
      </div>
    </AccountGuard>
  );
}
