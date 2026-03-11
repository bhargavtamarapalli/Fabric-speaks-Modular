'use client';
import { NavBar } from '@/components/organisms/NavBar';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { ProductCard } from '@/components/molecules/ProductCard';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const STAGGER_CHILD = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

export default function Home() {
  const dummyProducts = [
    { id: '1', slug: 'heavy-linen-canvas', name: 'Heavy Linen Canvas', brand: { name: 'Fabric Speaks' }, price: 4500, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600' },
    { id: '2', slug: 'raw-silk-noil', name: 'Raw Silk Noil', brand: { name: 'Heritage' }, price: 6200, sale_price: 5500, sale_active: true, thumbnail_url: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=600' },
    { id: '3', slug: 'kora-cotton-muslin', name: 'Kora Cotton Muslin', brand: { name: 'Earth' }, price: 1200, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?auto=format&fit=crop&q=80&w=600' },
    { id: '4', slug: 'hemp-twill', name: 'Hemp Twill', brand: { name: 'Fabric Speaks' }, price: 3400, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1528321917418-4dcb8ed99955?auto=format&fit=crop&q=80&w=600' },
  ];

  return (
    <main className="min-h-screen bg-[var(--fs-surface)] text-[var(--fs-ivory)] overflow-hidden">
      <NavBar />

      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Abstract Background element placeholder */}
        <div className="absolute inset-0 bg-[var(--fs-void)] z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--fs-void)] opacity-80 z-10" />
        
        {/* Optional background image or video for hero */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity">
          <Image 
            src="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Texture"
            fill
            className="object-cover"
            priority
          />
        </div>

        <motion.div 
          className="relative z-20 flex flex-col items-center text-center px-4 max-w-4xl"
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 
            variants={STAGGER_CHILD}
            className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-tight text-[var(--fs-linen)] mb-6"
          >
            The Language <br/> of Thread.
          </motion.h1>
          <motion.p 
            variants={STAGGER_CHILD}
            className="font-sans text-lg md:text-xl text-[var(--fs-ash)] max-w-xl mb-10"
          >
            Discover uncompromised raw materials for creators who demand substance over spectacle.
          </motion.p>
          <motion.div variants={STAGGER_CHILD}>
            <Link href="/products">
              <MagneticButton>Explore Catalog</MagneticButton>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee Banner */}
      <div className="w-full bg-[var(--fs-linen)] py-3 overflow-hidden border-y border-[var(--fs-wire)]">
        <motion.div 
          className="whitespace-nowrap flex gap-8 items-center font-mono text-[12px] uppercase tracking-widest text-[var(--fs-void)]"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 20, repeat: Infinity }}
        >
          {Array(10).fill(null).map((_, i) => (
            <span key={i} className="flex items-center gap-8">
              <span>Raw Materials</span>
              <span className="w-1.5 h-1.5 bg-[var(--fs-void)] rounded-full" />
              <span>Ethical Sourcing</span>
              <span className="w-1.5 h-1.5 bg-[var(--fs-void)] rounded-full" />
              <span>Uncompromised Quality</span>
              <span className="w-1.5 h-1.5 bg-[var(--fs-void)] rounded-full" />
            </span>
          ))}
        </motion.div>
      </div>

      {/* Collections Strip */}
      <section className="py-24 px-4 md:px-8 max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end mb-12">
          <h2 className="font-serif text-3xl md:text-4xl text-[var(--fs-ivory)]">Featured Collections</h2>
          <Link href="/collections" className="font-sans text-[13px] uppercase tracking-wider text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors inline-block border-b border-transparent hover:border-[var(--fs-linen)]">
            View All
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-8 snap-x hide-scrollbar">
          {[
            { title: 'The Linen Edit', img: 'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&q=80&w=400' },
            { title: 'Raw Silks', img: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=400' },
            { title: 'Heavy Canvas', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400' },
            { title: 'Monochrome', img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=400' }
          ].map((col, idx) => (
            <Link key={idx} href={`/collections/${idx}`} className="group relative min-w-[280px] md:min-w-[320px] aspect-[4/5] overflow-hidden bg-[var(--fs-surface-2)] snap-start">
              <Image 
                src={col.img} 
                alt={col.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100 mix-blend-luminosity group-hover:mix-blend-normal"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--fs-void)]/90 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="font-serif text-2xl text-[var(--fs-linen)] mb-1">{col.title}</h3>
                <span className="font-sans flex items-center gap-2 text-[13px] text-[var(--fs-ash)] group-hover:text-[var(--fs-ivory)] transition-colors">
                  Explore <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-24 px-4 md:px-8 bg-[var(--fs-surface-2)]">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-[var(--fs-ivory)]">New Arrivals</h2>
            <Link href="/products" className="font-sans text-[13px] uppercase tracking-wider text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors inline-block border-b border-transparent hover:border-[var(--fs-linen)]">
              Shop All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dummyProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Simple Footer for now */}
      <footer className="py-12 border-t border-[var(--fs-wire)] text-center text-[var(--fs-ash)] font-sans text-sm">
        <p>&copy; 2026 Fabric Speaks. All rights reserved.</p>
      </footer>
    </main>
  );
}
