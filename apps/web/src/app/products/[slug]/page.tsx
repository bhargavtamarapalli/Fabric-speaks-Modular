'use client';
import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { NavBar } from '@/components/organisms/NavBar';
import { SizeGuideModal } from '@/components/organisms/SizeGuideModal';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { Heart, ChevronRight, ChevronLeft, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Product Data
const DUMMY_PRODUCT = {
  id: 'pro_12345',
  slug: 'heavy-linen-canvas',
  name: 'Structured Heavy Linen Canvas Jacket',
  brand: { name: 'Fabric Speaks' },
  price: 4500,
  sale_price: 3900,
  sale_active: true,
  description: 'Constructed from a raw, unbleached linen canvas, this jacket offers a rigid architectural form that softens uniquely over time. Built for longevity and patina.',
  details: {
    fabricType: '100% Raw Heavyweight Linen',
    gsm: '320 GSM',
    weave: 'Canvas Basket Weave',
    breathability: 'High',
    care: 'Dry clean only initially. Hand wash cold separately if necessary. Do not tumble dry.',
    origin: 'Woven in Flanders, Belgium'
  },
  images: [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&q=80&w=800'
  ],
  sizes: [
    { label: 'XS', inStock: true },
    { label: 'S', inStock: true },
    { label: 'M', inStock: false },
    { label: 'L', inStock: true },
    { label: 'XL', inStock: true }
  ],
  colors: [
    { label: 'Unbleached Flax', hex: '#d2b48c', code: 'C_UNB' },
    { label: 'Void Black', hex: '#0a0a0a', code: 'C_VOID' }
  ]
};

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(DUMMY_PRODUCT.colors[0].code);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const { showToast } = useToast();

  const handleAddToCart = () => {
    if (!selectedSize) {
      showToast("Please select a size first", "error");
      return;
    }
    setAddingToCart(true);
    setTimeout(() => {
      setAddingToCart(false);
      // Show cart drawer (to be implemented)
      showToast("Success! Item added to your weave.", "success");
    }, 800);
  };

  const nextImage = () => {
    setCurrentImageIdx((prev) => (prev + 1) % DUMMY_PRODUCT.images.length);
  };

  const prevImage = () => {
    setCurrentImageIdx((prev) => (prev === 0 ? DUMMY_PRODUCT.images.length - 1 : prev - 1));
  };

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col pt-16 md:pt-24 pb-24 md:pb-0">
      <NavBar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto md:px-8 flex flex-col md:flex-row gap-8 lg:gap-16">
        
        {/* Left Column: Image Gallery */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="relative w-full aspect-[4/5] md:aspect-auto md:h-[calc(100vh-140px)] bg-[var(--fs-surface-2)] overflow-hidden group">
            {/* Main Image with AnimatePresence for gallery transition */}
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIdx}
                src={DUMMY_PRODUCT.images[currentImageIdx]}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Gallery Navigation Controls (Hover visible on desktop, always on mobile) */}
            <div className="absolute inset-0 flex items-center justify-between p-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={prevImage} className="w-10 h-10 rounded-full bg-[var(--fs-surface)]/80 backdrop-blur flex items-center justify-center text-[var(--fs-ivory)] hover:bg-[var(--fs-linen)] hover:text-[var(--fs-void)] transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} className="w-10 h-10 rounded-full bg-[var(--fs-surface)]/80 backdrop-blur flex items-center justify-center text-[var(--fs-ivory)] hover:bg-[var(--fs-linen)] hover:text-[var(--fs-void)] transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          {/* Thumbnail list (Desktop only) */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {DUMMY_PRODUCT.images.map((img, idx) => (
              <button 
                key={idx} 
                onClick={() => setCurrentImageIdx(idx)}
                className={`flex-shrink-0 relative w-20 h-24 overflow-hidden border-2 transition-colors ${idx === currentImageIdx ? 'border-[var(--fs-linen)]' : 'border-transparent'}`}
              >
                <img src={img} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Product Details & Actions */}
        <div className="w-full md:w-1/2 px-4 md:px-0 py-4 md:py-8 flex flex-col h-auto md:h-[calc(100vh-140px)] md:overflow-y-auto hide-scrollbar">
          
          <div className="mb-2 flex items-center justify-between">
            <span className="font-sans text-[12px] uppercase tracking-widest text-[var(--fs-ash)]">
              {DUMMY_PRODUCT.brand.name}
            </span>
            <div className="flex gap-4 text-[var(--fs-ash)]">
              <button aria-label="Share">
                <Share2 size={18} className="hover:text-[var(--fs-linen)] transition-colors" />
              </button>
              <button onClick={() => setWishlisted(!wishlisted)} aria-label="Wishlist">
                <Heart size={18} className={`transition-colors ${wishlisted ? 'fill-[var(--fs-linen)] text-[var(--fs-linen)]' : 'hover:text-[var(--fs-linen)]'}`} />
              </button>
            </div>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl text-[var(--fs-ivory)] leading-tight mb-4">
            {DUMMY_PRODUCT.name}
          </h1>

          <div className="flex items-center gap-3 font-mono text-xl mb-8">
            <span className="text-[var(--fs-linen)]">₹{DUMMY_PRODUCT.sale_active ? DUMMY_PRODUCT.sale_price : DUMMY_PRODUCT.price}</span>
            {DUMMY_PRODUCT.sale_active && (
              <span className="text-[var(--fs-ash)] line-through text-base">₹{DUMMY_PRODUCT.price}</span>
            )}
          </div>

          {/* CRITICAL REQUIREMENT: Prominent Fabric Details Section */}
          <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)] mb-8">
            <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-linen)] mb-4 border-b border-[var(--fs-wire)] pb-2 text-center md:text-left">
              The Fabric Identity
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Make</dt>
                <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{DUMMY_PRODUCT.details.fabricType}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Weight</dt>
                <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{DUMMY_PRODUCT.details.gsm}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Weave</dt>
                <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{DUMMY_PRODUCT.details.weave}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Origin</dt>
                <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{DUMMY_PRODUCT.details.origin}</dd>
              </div>
            </div>
          </div>

          {/* Variants Selector */}
          <div className="flex flex-col gap-8 mb-8">
            {/* Color */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)]">Color</span>
                <span className="font-sans text-[13px] text-[var(--fs-ash)]">
                  {DUMMY_PRODUCT.colors.find(c => c.code === selectedColor)?.label}
                </span>
              </div>
              <div className="flex gap-3">
                {DUMMY_PRODUCT.colors.map(color => (
                  <button
                    key={color.code}
                    onClick={() => setSelectedColor(color.code)}
                    className={`w-10 h-10 rounded-full border-2 p-0.5 transition-all ${selectedColor === color.code ? 'border-[var(--fs-linen)]' : 'border-transparent'}`}
                    aria-label={color.label}
                  >
                    <div className="w-full h-full rounded-full border border-black/20" style={{ backgroundColor: color.hex }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)]">Size</span>
                <button 
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="font-sans text-[12px] text-[var(--fs-ash)] hover:text-[var(--fs-linen)] underline underline-offset-4"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {DUMMY_PRODUCT.sizes.map(size => (
                  <button
                    key={size.label}
                    onClick={() => size.inStock && setSelectedSize(size.label)}
                    disabled={!size.inStock}
                    className={`
                      py-3 text-center font-mono text-[14px] uppercase tracking-wider border transition-colors
                      ${!size.inStock 
                        ? 'opacity-30 border-[var(--fs-wire)] text-[var(--fs-ash)] cursor-not-allowed bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),var(--fs-wire),transparent_calc(50%+1px))]' 
                        : selectedSize === size.label 
                          ? 'border-[var(--fs-linen)] bg-[var(--fs-linen)] text-[var(--fs-void)]' 
                          : 'border-[var(--fs-wire)] text-[var(--fs-ivory)] hover:border-[var(--fs-linen)]'}
                    `}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)] mb-3">
              Description
            </h3>
            <p className="font-sans text-[14px] leading-relaxed text-[var(--fs-ash)]">
              {DUMMY_PRODUCT.description}
            </p>
          </div>

          {/* Desktop Add to Cart Button */}
          <div className="hidden md:block w-full">
            <MagneticButton 
              className="w-full py-5 text-[14px]"
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? 'Translating to Cart...' : 'Add to Cart — ₹' + (DUMMY_PRODUCT.sale_active ? DUMMY_PRODUCT.sale_price : DUMMY_PRODUCT.price)}
            </MagneticButton>
          </div>

        </div>
      </main>

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[var(--fs-surface)]/90 backdrop-blur-md border-t border-[var(--fs-wire)] p-4 z-40">
        <MagneticButton 
          className="w-full py-4 text-[13px]"
          onClick={handleAddToCart}
          disabled={addingToCart}
        >
          {addingToCart ? 'Translating...' : 'Add to Cart'}
        </MagneticButton>
      </div>

      <SizeGuideModal 
        isOpen={isSizeGuideOpen} 
        onClose={() => setIsSizeGuideOpen(false)} 
        fabricType={DUMMY_PRODUCT.details.fabricType}
        careInstructions={DUMMY_PRODUCT.details.care}
      />
    </div>
  );
}
