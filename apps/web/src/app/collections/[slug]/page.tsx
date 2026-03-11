'use client';
import { useRef } from 'react';
import { NavBar } from '@/components/organisms/NavBar';
import { ProductCard, Product } from '@/components/molecules/ProductCard';
import { motion, useScroll, useTransform } from 'framer-motion';

const DUMMY_PRODUCTS: Product[] = [
  { id: '1', slug: 'heavy-linen-canvas', name: 'Heavy Linen Canvas', brand: { name: 'Fabric Speaks' }, price: 4500, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600' },
  { id: '2', slug: 'raw-silk-noil', name: 'Raw Silk Noil', brand: { name: 'Heritage' }, price: 6200, sale_price: 5500, sale_active: true, thumbnail_url: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=600' },
  { id: '3', slug: 'kora-cotton-muslin', name: 'Kora Cotton Muslin', brand: { name: 'Earth' }, price: 1200, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?auto=format&fit=crop&q=80&w=600' },
  { id: '4', slug: 'hemp-twill', name: 'Hemp Twill', brand: { name: 'Fabric Speaks' }, price: 3400, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1528321917418-4dcb8ed99955?auto=format&fit=crop&q=80&w=600' },
];

export default function CollectionLandingPage({ params }: { params: { slug: string } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax effects
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "150%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col">
      <NavBar />
      
      {/* Hero Full Bleed with Parallax */}
      <section ref={containerRef} className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Parallax Image */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y: imageY }}
        >
          <img 
            src="https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&q=80&w=2000" 
            alt="The Linen Edit Collection"
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
          />
        </motion.div>
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--fs-void)]/40 to-[var(--fs-surface)] z-10" />

        {/* Parallax Text */}
        <motion.div 
          className="relative z-20 text-center px-4 max-w-4xl mt-32"
          style={{ y: textY, opacity }}
        >
          <h2 className="font-sans text-[13px] uppercase tracking-[0.2em] text-[var(--fs-ash)] mb-6">
            Collection 01
          </h2>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-tight text-[var(--fs-linen)] mb-8">
            The Linen Edit.
          </h1>
          <p className="font-sans text-lg md:text-xl text-[var(--fs-ash)] max-w-2xl mx-auto leading-relaxed">
            A curation of heavyweight flax canvases and soft-washed noils, exploring the structural limits and inherent breathability of the world's oldest cultivated fiber.
          </p>
        </motion.div>
      </section>

      {/* Product List */}
      <section className="relative z-30 bg-[var(--fs-surface)] py-24 px-4 md:px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex justify-between items-end mb-12">
            <span className="font-mono text-[13px] text-[var(--fs-ash)]">{DUMMY_PRODUCTS.length} Fabrics</span>
            <div className="flex items-center gap-2 font-sans text-[13px] text-[var(--fs-ash)]">
              Sort by: 
              <select className="bg-transparent text-[var(--fs-ivory)] border-none outline-none cursor-pointer tracking-wider">
                <option className="bg-[var(--fs-surface)]">Featured</option>
                <option className="bg-[var(--fs-surface)]">Newest</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {DUMMY_PRODUCTS.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Block Bottom */}
      <section className="py-24 px-4 md:px-8 border-t border-[var(--fs-wire)]">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-serif text-3xl text-[var(--fs-ivory)] mb-6">Designed for Aging</h3>
          <p className="font-sans text-[15px] leading-relaxed text-[var(--fs-ash)]">
            Our linen collection is meant to break in, not break down. The fibers have been selected for length and tensile strength, guaranteeing a fabric that conforms to your form over years of wear.
          </p>
        </div>
      </section>
    </div>
  );
}
