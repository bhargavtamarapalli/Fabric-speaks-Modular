'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { NavBar } from '@/components/organisms/NavBar';
import { SizeGuideModal } from '@/components/organisms/SizeGuideModal';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { Heart, ChevronRight, ChevronLeft, Share2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductBySlug, Product } from '@/lib/api/products';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const { showToast } = useToast();

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProductBySlug(params.slug);
      setProduct(res);
      if (res.variants.length > 0) {
        setSelectedVariantId(res.variants[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = () => {
    if (!selectedVariantId) {
      showToast("Please select a variant first", "error");
      return;
    }
    setAddingToCart(true);
    setTimeout(() => {
      setAddingToCart(false);
      showToast("Success! Item added to your weave.", "success");
    }, 800);
  };

  const nextImage = () => {
    if (!product) return;
    setCurrentImageIdx((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    if (!product) return;
    setCurrentImageIdx((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--fs-linen)]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-serif text-[var(--fs-ivory)] mb-4">Product not found</h2>
        <p className="text-[var(--fs-ash)] mb-8 max-w-md">{error}</p>
        <Link href="/products">
          <MagneticButton>Back to Shop</MagneticButton>
        </Link>
      </div>
    );
  }

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
  const displayPrice = product.isSaleActive && selectedVariant?.salePrice ? selectedVariant.salePrice : (selectedVariant?.price || product.price);

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col pt-16 md:pt-24 pb-24 md:pb-0">
      <NavBar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto md:px-8 flex flex-col md:flex-row gap-8 lg:gap-16">
        
        {/* Left Column: Image Gallery */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="relative w-full aspect-[4/5] md:aspect-auto md:h-[calc(100vh-140px)] bg-[var(--fs-surface-2)] overflow-hidden group">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIdx}
                src={product.images[currentImageIdx]}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>

            <div className="absolute inset-0 flex items-center justify-between p-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={prevImage} className="w-10 h-10 rounded-full bg-[var(--fs-surface)]/80 backdrop-blur flex items-center justify-center text-[var(--fs-ivory)] hover:bg-[var(--fs-linen)] hover:text-[var(--fs-void)] transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} className="w-10 h-10 rounded-full bg-[var(--fs-surface)]/80 backdrop-blur flex items-center justify-center text-[var(--fs-ivory)] hover:bg-[var(--fs-linen)] hover:text-[var(--fs-void)] transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="hidden md:flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {product.images.map((img, idx) => (
              <button 
                key={idx} 
                onClick={() => setCurrentImageIdx(idx)}
                className={`flex-shrink-0 relative w-20 h-24 overflow-hidden border-2 transition-colors ${idx === currentImageIdx ? 'border-[var(--fs-linen)]' : 'border-transparent'}`}
              >
                <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="w-full md:w-1/2 px-4 md:px-0 py-4 md:py-8 flex flex-col h-auto md:h-[calc(100vh-140px)] md:overflow-y-auto hide-scrollbar">
          
          <div className="mb-2 flex items-center justify-between">
            <span className="font-sans text-[12px] uppercase tracking-widest text-[var(--fs-ash)]">
              {product.brandName}
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
            {product.name}
          </h1>

          <div className="flex items-center gap-3 font-mono text-xl mb-8">
            <span className="text-[var(--fs-linen)]">₹{displayPrice.toLocaleString('en-IN')}</span>
            {product.isSaleActive && selectedVariant?.salePrice && selectedVariant.salePrice < selectedVariant.price && (
              <span className="text-[var(--fs-ash)] line-through text-base">₹{selectedVariant.price.toLocaleString('en-IN')}</span>
            )}
          </div>

          {/* Fabric Identity */}
          <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)] mb-8">
            <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-linen)] mb-4 border-b border-[var(--fs-wire)] pb-2">
              The Fabric Identity
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Make</dt>
                <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{product.fabricType}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Weight</dt>
                <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{product.gsmWeight} GSM</dd>
              </div>
              <div>
                <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Weave</dt>
                <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{product.weaveType}</dd>
              </div>
              <div>
                  <dt className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-wider mb-1">Category</dt>
                  <dd className="text-[14px] font-sans text-[var(--fs-ivory)]">{product.categoryName}</dd>
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className="flex flex-col gap-8 mb-8">
            {/* Variants selection logic here - simplified for now to just show labels */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)]">Options</span>
                <button 
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="font-sans text-[12px] text-[var(--fs-ash)] hover:text-[var(--fs-linen)] underline underline-offset-4"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {product.variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => variant.stockQty > 0 && setSelectedVariantId(variant.id)}
                    disabled={variant.stockQty === 0}
                    className={`
                      py-3 text-center font-mono text-[12px] uppercase tracking-wider border transition-colors
                      ${variant.stockQty === 0 
                        ? 'opacity-30 border-[var(--fs-wire)] text-[var(--fs-ash)] cursor-not-allowed' 
                        : selectedVariantId === variant.id 
                          ? 'border-[var(--fs-linen)] bg-[var(--fs-linen)] text-[var(--fs-void)]' 
                          : 'border-[var(--fs-wire)] text-[var(--fs-ivory)] hover:border-[var(--fs-linen)]'}
                    `}
                  >
                    {variant.colour} / {variant.size}
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
              {product.description}
            </p>
          </div>

          <div className="hidden md:block w-full">
            <MagneticButton 
              className="w-full py-5 text-[14px]"
              onClick={handleAddToCart}
              disabled={addingToCart || !selectedVariantId}
            >
              {addingToCart ? 'Translating to Cart...' : 'Add to Cart — ₹' + displayPrice.toLocaleString('en-IN')}
            </MagneticButton>
          </div>

        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[var(--fs-surface)]/90 backdrop-blur-md border-t border-[var(--fs-wire)] p-4 z-40">
        <MagneticButton 
          className="w-full py-4 text-[13px]"
          onClick={handleAddToCart}
          disabled={addingToCart || !selectedVariantId}
        >
          {addingToCart ? 'Translating...' : 'Add to Cart'}
        </MagneticButton>
      </div>

      <SizeGuideModal 
        isOpen={isSizeGuideOpen} 
        onClose={() => setIsSizeGuideOpen(false)} 
        fabricType={product.fabricType}
      />
    </div>
  );
}

import Link from 'next/link';
