'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { NavBar } from '@/components/organisms/NavBar';
import { ProductCard } from '@/components/molecules/ProductCard';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getCollectionBySlug, CollectionDetail } from '@/lib/api/collections';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { EmptyState } from '@/components/atoms/EmptyState';

// ─── Parallax Hero (isolated so useScroll only runs when the DOM node exists) ──

function CollectionHero({ collection }: { collection: CollectionDetail }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const imageY  = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const textY   = useTransform(scrollYProgress, [0, 1], ['0%', '150%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      <motion.div className="absolute inset-0 z-0" style={{ y: imageY }}>
        {collection.imageUrl && (
          <img
            src={collection.imageUrl}
            alt={collection.name}
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
          />
        )}
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--fs-void)]/40 to-[var(--fs-surface)] z-10" />

      <motion.div
        className="relative z-20 text-center px-4 max-w-4xl mt-32"
        style={{ y: textY, opacity }}
      >
        <h2 className="font-sans text-[13px] uppercase tracking-[0.2em] text-[var(--fs-ash)] mb-6">
          Fabric Collection
        </h2>
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-tight text-[var(--fs-linen)] mb-8">
          {collection.name}
        </h1>
        <p className="font-sans text-lg md:text-xl text-[var(--fs-ash)] max-w-2xl mx-auto leading-relaxed">
          {collection.description}
        </p>
      </motion.div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionLandingPage({ params }: { params: { slug: string } }) {
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCollectionBySlug(params.slug);
      setCollection(res);
    } catch (err: any) {
      setError(err.message || 'Collection not found');
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--fs-linen)]" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-serif text-[var(--fs-ivory)] mb-4">Collection not found</h2>
        <p className="text-[var(--fs-ash)] mb-8 max-w-md">{error}</p>
        <Link href="/collections">
          <MagneticButton>All Collections</MagneticButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col">
      <NavBar />

      {/* Hero — rendered only after data loads, so useScroll ref hydrates correctly */}
      <CollectionHero collection={collection} />

      {/* Product List */}
      <section className="relative z-30 bg-[var(--fs-surface)] py-24 px-4 md:px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex justify-between items-end mb-12">
            <span className="font-mono text-[13px] text-[var(--fs-ash)]">
              {collection.products?.length ?? 0} Fabrics
            </span>
            <div className="flex items-center gap-2 font-sans text-[13px] text-[var(--fs-ash)]">
              Sort by:
              <select className="bg-transparent text-[var(--fs-ivory)] border-none outline-none cursor-pointer tracking-wider">
                <option className="bg-[var(--fs-surface)]">Featured</option>
                <option className="bg-[var(--fs-surface)]">Newest</option>
              </select>
            </div>
          </div>

          {(collection.products?.length ?? 0) === 0 ? (
            <EmptyState variant="restocking" />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {collection.products?.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Editorial Block */}
      <section className="py-24 px-4 md:px-8 border-t border-[var(--fs-wire)]">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-serif text-3xl text-[var(--fs-ivory)] mb-6">Designed for Aging</h3>
          <p className="font-sans text-[15px] leading-relaxed text-[var(--fs-ash)]">
            Our {collection.name.toLowerCase()} collection is meant to break in, not break down. The fibers have been selected
            for length and tensile strength, guaranteeing a fabric that conforms to your form over years of wear.
          </p>
        </div>
      </section>
    </div>
  );
}
