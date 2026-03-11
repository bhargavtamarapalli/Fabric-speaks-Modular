'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, ShoppingCart, Search, User, Heart, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  const isTransparentInitial = pathname === '/' || pathname.startsWith('/stories/') || pathname.startsWith('/collections/');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isSolid = scrolled || !isTransparentInitial || isMobileMenuOpen;

  const NAV_LINKS = [
    { label: 'SHOP', href: '/products' },
    { label: 'COLLECTIONS', href: '/collections/all' },
    { label: 'OUR STORY', href: '/stories/about' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b ${
          isSolid 
            ? 'bg-[var(--fs-surface)]/90 backdrop-blur-md border-[var(--fs-wire)]' 
            : 'bg-transparent border-transparent'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          {/* Mobile: Hamburger Left */}
          <div className="flex md:hidden flex-1 justify-start">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-[var(--fs-ivory)]"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>

          {/* Desktop: Nav Links Left */}
          <nav className="hidden md:flex flex-1 gap-8 text-[12px] uppercase tracking-[0.2em] font-sans font-medium text-[var(--fs-ivory)]">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="hover:text-[var(--fs-linen)] transition-colors relative group">
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[var(--fs-linen)] transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Logo: Center */}
          <Link href="/" className="flex-1 md:flex-none flex justify-center text-center">
            <span className="font-serif text-2xl md:text-3xl tracking-wide text-[var(--fs-ivory)] whitespace-nowrap">
              FABRIC SPEAKS
            </span>
          </Link>

          {/* Right side: Search + Wishlist + Account + Cart */}
          <div className="flex flex-1 justify-end items-center gap-1 md:gap-4">
            <Link href="/search" className="text-[var(--fs-ivory)] hover:text-[var(--fs-linen)] transition-colors p-2 hidden lg:block">
              <Search size={20} strokeWidth={1.5} />
            </Link>
            
            <Link href="/account/wishlist" className="text-[var(--fs-ivory)] hover:text-[var(--fs-linen)] transition-colors p-2 hidden sm:block">
              <Heart size={20} strokeWidth={1.5} />
            </Link>

            <Link href="/account/profile" className="text-[var(--fs-ivory)] hover:text-[var(--fs-linen)] transition-colors p-2 hidden sm:block">
              <User size={20} strokeWidth={1.5} />
            </Link>

            <Link href="/cart" className="relative text-[var(--fs-ivory)] hover:text-[var(--fs-linen)] transition-colors p-2 -mr-2">
              <ShoppingCart size={22} strokeWidth={1.5} />
              <span className="absolute top-1 right-0 w-4 h-4 rounded-full bg-[var(--fs-linen)] text-[var(--fs-void)] text-[9px] font-mono flex items-center justify-center font-bold">
                2
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[90] bg-[var(--fs-void)] pt-24 px-8 md:hidden"
          >
            <nav className="flex flex-col gap-8">
              {NAV_LINKS.map((link, idx) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                >
                  <Link 
                    href={link.href}
                    className="font-serif text-4xl text-[var(--fs-ivory)] hover:text-[var(--fs-linen)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 pt-12 border-t border-[var(--fs-wire)] flex flex-col gap-6"
              >
                <Link href="/account/profile" className="flex items-center gap-4 text-[var(--fs-ash)] uppercase tracking-widest text-sm">
                  <User size={18} /> Account information
                </Link>
                <Link href="/account/wishlist" className="flex items-center gap-4 text-[var(--fs-ash)] uppercase tracking-widest text-sm">
                  <Heart size={18} /> Wishlisted items
                </Link>
                <Link href="/search" className="flex items-center gap-4 text-[var(--fs-ash)] uppercase tracking-widest text-sm">
                  <Search size={18} /> Search catalog
                </Link>
              </motion.div>
            </nav>

            <div className="absolute bottom-12 left-8 right-8 text-[var(--fs-ash)] text-xs uppercase tracking-[0.2em]">
              Fabric Speaks — High Fidelity Craft
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
