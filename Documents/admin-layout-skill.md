# SKILL: Admin Dashboard Responsive Layout
# Load this when: building admin dashboard screens, layout components, navigation
# Antigravity: add to Knowledge Base as "admin-layout-skill"

## 1. Breakpoints and Responsive System

Always use these exact breakpoints for the Admin Dashboard layout to maintain consistency across the app. 

```css
/* Tailwind Configuration Breakdown */
--mobile:    max-width: 480px;  /* Mobile devices */
--tablet:    max-width: 768px;  /* md: iPads, small tablets */
--laptop:    max-width: 1024px; /* lg: Small laptops */
--desktop:   min-width: 1025px; /* xl & 2xl: Desktops */
```

## 2. Layout State Management

Use a centralized React Context or Zustand store to manage the layout's responsive state across components.

```tsx
// lib/store/layoutStore.ts (Example using Zustand)
import { create } from 'zustand';

interface LayoutState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarOpen: false, // Default closed on mobile, expanded via CSS on desktop
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  activeNav: 'dashboard',
  setActiveNav: (nav) => set({ activeNav: nav }),
}));
```

## 3. Top App Bar (Header)

The Top Bar displays context based on the current breakpoint. On mobile, the search bar expands over the entire header.

```tsx
// components/layout/TopBar.tsx
export function TopBar() {
  const { toggleSidebar } = useLayoutStore();
  
  return (
    <header className="sticky top-0 z-40 bg-[var(--fs-surface)] border-b border-[var(--fs-wire)] h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Mobile/Tablet Menu Toggle */}
      <div className="flex items-center gap-4 hidden sm:flex">
        <button 
          onClick={toggleSidebar} 
          className="lg:hidden p-2 text-[var(--fs-ivory)] hover:bg-[var(--fs-surface-2)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--fs-linen)]"
          aria-label="Toggle Sidebar"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <div className="font-semibold text-lg text-[var(--fs-ivory)] hidden sm:block">
          AdminPanel
        </div>
      </div>

      {/* Right Side: Search, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto w-full sm:w-auto">
        {/* Expandable Search Input (Hidden behind icon on mobile) */}
        <div className="relative hidden md:block w-64 lg:w-96 transition-all duration-300">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fs-ash)]" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-[var(--fs-surface-2)] text-[var(--fs-ivory)] placeholder-[var(--fs-ash)] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-[var(--fs-linen)] transition-all"
          />
        </div>
        
        {/* Mobile Expanded Search overlay */}
        <div className="md:hidden flex-1 relative">
           <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fs-ash)] z-10" />
           <input type="text" placeholder="Search..." className="w-full bg-[var(--fs-surface-2)] rounded-full py-2 pl-10 pr-4" />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-[var(--fs-ivory)] hover:bg-[var(--fs-surface-2)] rounded-full transition-colors hidden sm:block" aria-label="Notifications">
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--fs-error)] rounded-full border border-[var(--fs-surface)]"></span>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[var(--fs-linen)] text-[var(--fs-void)] flex items-center justify-center font-bold ml-2 cursor-pointer border border-[var(--fs-linen)]">
          AD
        </div>
      </div>
    </header>
  );
}
```

## 4. Sidebar Navigation (Desktop/Tablet)

The sidebar is fixed and persistent on desktop but functions as an off-canvas drawer on tablet, hidden completely on mobile in favor of the Bottom Nav.

```tsx
// components/layout/Sidebar.tsx
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useLayoutStore();

  return (
    <>
      {/* Tablet Overlay Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden hidden sm:block"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : "-100%" }}
        // On desktop (lg+), override animation and keep sidebar statically positioned
        className="fixed lg:sticky lg:translate-x-0 top-0 left-0 z-50 h-screen w-[250px] bg-[var(--fs-surface)] border-r border-[var(--fs-wire)] flex flex-col transition-transform duration-300 ease-in-out lg:transition-none pt-16 lg:pt-0 pb-[72px] lg:pb-0 hidden sm:flex"
      >
        <div className="p-4 border-b border-[var(--fs-wire)] block lg:hidden">
            <h2 className="font-semibold text-[var(--fs-ivory)]">Navigation</h2>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <NavItem icon={<DashboardIcon />} label="Dashboard" href="/admin" />
          <NavItem icon={<UsersIcon />} label="Users" href="/admin/users" />
          {/* Nested menus go here */}
        </nav>
      </motion.aside>
    </>
  );
}
```

## 5. Bottom Navigation Bar (Mobile Only)

Appears only on mobile devices (max-width: 480px / 768px). Fixed to the bottom.

```tsx
// components/layout/BottomNav.tsx
export function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--fs-surface)] border-t border-[var(--fs-wire)] h-[72px] pb-safe flex justify-around items-center px-2">
      <BottomNavItem icon={<DashboardIcon />} label="Home" href="/admin" active />
      <BottomNavItem icon={<UsersIcon />} label="Users" href="/admin/users" />
      <BottomNavItem icon={<OrdersIcon />} label="Orders" href="/admin/orders" />
      <BottomNavItem icon={<AnalyticsIcon />} label="Data" href="/admin/analytics" />
      <BottomNavItem icon={<SettingsIcon />} label="Settings" href="/admin/settings" />
    </nav>
  );
}

function BottomNavItem({ icon, label, active }) {
  return (
    <button className={`flex flex-col items-center justify-center w-full h-full space-y-1 min-w-[44px] min-h-[44px] ${active ? 'text-[var(--fs-linen)]' : 'text-[var(--fs-ash)]'}`}>
      <div className="w-6 h-6">{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
      {/* Active state indicator dot */}
      {active && <span className="mt-1 w-1 h-1 bg-[var(--fs-linen)] rounded-full" />}
    </button>
  );
}
```

## 6. Main Content Area Structure

Wraps everything together. Ensures proper scroll behavior.

```tsx
// components/layout/AdminLayout.tsx
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--fs-void)] flex flex-col sm:flex-row text-[var(--fs-ivory)] font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <TopBar />
        
        {/* Content scrolling container */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto relative pb-[72px] sm:pb-0 scroll-smooth">
          {/* Constrain content width max, standard padding */}
          <div className="mx-auto max-w-7xl px-4 py-6 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
        
        <BottomNav />
      </div>
    </div>
  );
}
```

## 7. Data Grids and Tables in Responsive Views

Always manage overflow gracefully. Use card layouts on mobile instead of horizontal scrolling tables when possible.

```tsx
{/* Mobile Card Layout Fallback for Tables */}
<div className="block lg:hidden space-y-4">
  {data.map(item => (
    <div key={item.id} className="bg-[var(--fs-surface-2)] p-4 rounded-lg border border-[var(--fs-wire)]">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">{item.name}</span>
        <Badge status={item.status} />
      </div>
      <div className="text-sm text-[var(--fs-ash)]">{item.email}</div>
    </div>
  ))}
</div>

{/* Desktop Table Layout */}
<div className="hidden lg:block overflow-x-auto rounded-lg border border-[var(--fs-wire)] bg-[var(--fs-surface-2)]">
  <table className="w-full text-left text-sm">
      {/* Table Content */}
  </table>
</div>
```

## 8. Accessibility Requirements checklist:
- Touch targets on mobile must be minimum 44x44px. Added spacing/padding for components like navigation buttons.
- Focus rings on input/buttons (`focus:ring-2 focus:ring-[var(--fs-linen)] outline-none`).
- ARIA labels on all icon-only buttons (`aria-label="open search"`).
- `aria-hidden="true"` on decorative icons and overlays.
- Keydown handling (Escape key closes off-canvas drawer).

## Summary
- **Desktop (>1024px):** Fixed Sidebar + TopBar (Large Search) + Scrollable Main Content.
- **Tablet (481px - 1024px):** Hidden Sidebar (Hamburger Toggle -> off-canvas Drawer) + TopBar + Main Content.
- **Mobile (<=480px):** TopBar (Search Overlay) + Main Content + Fixed Bottom Nav Bar (Hidden Sidebar).
