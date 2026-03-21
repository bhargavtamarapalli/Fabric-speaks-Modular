'use client';
import { useState, useEffect, useCallback } from 'react';
import { NavBar } from '@/components/organisms/NavBar';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { ProductCard } from '@/components/molecules/ProductCard';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { getHomepageData, HomepageData } from '@/lib/api/homepage';

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
  const [data, setData] = useState<HomepageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getHomepageData();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load homepage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[var(--fs-linen)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-serif text-[var(--fs-ivory)] mb-4">Something went wrong</h2>
        <p className="text-[var(--fs-ash)] mb-8 max-w-md">{error}</p>
        <MagneticButton onClick={fetchHomeData}>Try Again</MagneticButton>
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-[var(--fs-surface)] text-[var(--fs-ivory)] overflow-hidden">
      <NavBar />

      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[var(--fs-void)] z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--fs-void)] opacity-80 z-10" />
        
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity">
          <Image 
            src={data.hero.imageUrl} 
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
            {data.hero.title}
          </motion.h1>
          <motion.p 
            variants={STAGGER_CHILD}
            className="font-sans text-lg md:text-xl text-[var(--fs-ash)] max-w-xl mb-10"
          >
            {data.hero.subtitle}
          </motion.p>
          <motion.div variants={STAGGER_CHILD}>
            <Link href={data.hero.ctaLink}>
              <MagneticButton>{data.hero.ctaText}</MagneticButton>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee Banner */}
      {data.announcement && (
        <div className="w-full bg-[var(--fs-linen)] py-3 overflow-hidden border-y border-[var(--fs-wire)]">
          <motion.div 
            className="whitespace-nowrap flex gap-8 items-center font-mono text-[12px] uppercase tracking-widest text-[var(--fs-void)]"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 20, repeat: Infinity }}
          >
            {Array(10).fill(null).map((_, i) => (
              <span key={i} className="flex items-center gap-8">
                <span>{data.announcement}</span>
                <span className="w-1.5 h-1.5 bg-[var(--fs-void)] rounded-full" />
              </span>
            ))}
          </motion.div>
        </div>
      )}

      {/* Collections Strip */}
      {data.featuredCollections.length > 0 && (
        <section className="py-24 px-4 md:px-8 max-w-[1280px] mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-[var(--fs-ivory)]">Featured Collections</h2>
            <Link href="/collections" className="font-sans text-[13px] uppercase tracking-wider text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors inline-block border-b border-transparent hover:border-[var(--fs-linen)]">
              View All
            </Link>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-8 snap-x hide-scrollbar">
            {data.featuredCollections.map((col) => (
              <Link key={col.id} href={`/collections/${col.slug}`} className="group relative min-w-[280px] md:min-w-[320px] aspect-[4/5] overflow-hidden bg-[var(--fs-surface-2)] snap-start">
                {col.imageUrl && (
                  <Image 
                    src={col.imageUrl} 
                    alt={col.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100 mix-blend-luminosity group-hover:mix-blend-normal"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--fs-void)]/90 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3 className="font-serif text-2xl text-[var(--fs-linen)] mb-1">{col.name}</h3>
                  <span className="font-sans flex items-center gap-2 text-[13px] text-[var(--fs-ash)] group-hover:text-[var(--fs-ivory)] transition-colors">
                    Explore <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Product Grid */}
      {data.featuredProducts.length > 0 && (
        <section className="py-24 px-4 md:px-8 bg-[var(--fs-surface-2)]">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex justify-between items-end mb-12">
              <h2 className="font-serif text-3xl md:text-4xl text-[var(--fs-ivory)]">New Arrivals</h2>
              <Link href="/products" className="font-sans text-[13px] uppercase tracking-wider text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors inline-block border-b border-transparent hover:border-[var(--fs-linen)]">
                Shop All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="py-12 border-t border-[var(--fs-wire)] text-center text-[var(--fs-ash)] font-sans text-sm">
        <p>&copy; 2026 Fabric Speaks. All rights reserved.</p>
      </footer>
    </main>
  );
}
