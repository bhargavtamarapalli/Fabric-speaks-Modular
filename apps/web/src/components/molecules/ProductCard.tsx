'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  price: number;
  salePrice?: number;
  isSaleActive: boolean;
  thumbnailUrl: string;
}

interface ProductCardProps {
  product: Product;
  onWishlistToggle?: (id: string, isAdded: boolean) => void;
  isInitialWishlisted?: boolean;
}

/**
 * Product detail card used in grids.
 * Displays image, brand, name, price (with sale price), and wishlist toggle.
 */
export function ProductCard({ product, onWishlistToggle, isInitialWishlisted = false }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(isInitialWishlisted);

  const displayPrice = product.isSaleActive && product.salePrice ? product.salePrice : (product.price ?? 0);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !wishlisted;
    setWishlisted(newState);
    if (onWishlistToggle) {
      onWishlistToggle(product.id, newState);
    }
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block relative overflow-hidden bg-[var(--fs-void)] rounded-[2px] border border-transparent hover:border-[var(--fs-wire)] transition-colors duration-300"
    >
      <div className="relative w-full pb-[135%] bg-[var(--fs-surface-2)] overflow-hidden">
        <motion.img
          src={product.thumbnailUrl || 'https://via.placeholder.com/400x540/1A1A1A/6B6560?text=Fabric'}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover"
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          loading="lazy"
        />

        {product.isSaleActive && (
          <div className="absolute top-2 left-2 bg-[var(--fs-error)] text-[var(--fs-ivory)] text-[10px] font-mono tracking-wider px-2 py-0.5 uppercase z-10">
            Sale
          </div>
        )}

        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-2 z-10 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 transition-colors"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <motion.div
            initial={false}
            animate={{ scale: wishlisted ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              className={wishlisted ? 'fill-[var(--fs-linen)] text-[var(--fs-linen)]' : 'text-[var(--fs-ivory)]'}
            />
          </motion.div>
        </button>
      </div>

      <div className="p-3 bg-[var(--fs-surface-2)] flex flex-col gap-1">
        <span className="text-[12px] font-sans text-[var(--fs-ash)] uppercase tracking-wide truncate">
          {product.brandName}
        </span>
        <h3 className="text-[14px] font-sans font-medium text-[var(--fs-ivory)] truncate">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[14px] text-[var(--fs-linen)]">
            ₹{displayPrice.toLocaleString('en-IN')}
          </span>
          {product.isSaleActive && product.salePrice && product.price && product.salePrice < product.price && (
            <span className="font-mono text-[12px] text-[var(--fs-ash)] line-through">
              ₹{typeof product.price === 'number' ? product.price.toLocaleString('en-IN') : '0'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
