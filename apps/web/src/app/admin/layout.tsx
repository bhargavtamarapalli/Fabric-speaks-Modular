import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ConfirmationModalProvider } from '@/components/admin/ConfirmationModal';

export const metadata = {
  title: 'Admin Panel | Fabric Speaks',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ConfirmationModalProvider>
      <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-100 overflow-hidden font-sans">
        {/* Dynamic Sidebar handles its own role-gating */}
        <AdminSidebar />
        
        {/* Main Scrolling Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </ConfirmationModalProvider>
  );
}
