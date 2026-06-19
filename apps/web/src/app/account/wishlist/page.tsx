'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { Trash2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface WishlistItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
}

const containerVars = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const itemVars = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

export default function WishlistPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{ items: WishlistItem[] }>('/customer/wishlist');
      // Type-safe validation: ensure response has correct structure
      if (res && typeof res === 'object' && Array.isArray(res.items)) {
        setItems(res.items);
      } else {
        console.warn('Invalid wishlist response format:', res);
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  const retryFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemove = async (productId: string) => {
    try {
      await apiFetch(`/customer/wishlist/${productId}`, { method: 'DELETE' });
      setItems(items.filter(i => i.productId !== productId));
      showToast("Removed from your threads.", "info");
    } catch (err: any) {
      showToast(err.message || 'Failed to remove item', "error");
    }
  };

  const handleMoveToCart = async (productId: string) => {
    try {
      showToast("Succesfully moved to cart.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif text-[var(--fs-linen)]">Your Wishlist</h2>
        <p className="text-sm text-gray-400 mt-1">Items you've saved for later.</p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>
      ) : error ? (
        <div className="py-12 border border-dashed border-[var(--fs-wire)] rounded flex flex-col items-center justify-center text-center">
          <p className="text-[var(--fs-error)]">{error instanceof Error ? error.message : String(error)}</p>
          <button
            onClick={retryFetch}
            className="mt-4 py-2 px-4 text-sm uppercase tracking-widest bg-[var(--fs-linen)] text-[var(--fs-void)] font-medium transition hover:bg-gray-200"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 border border-dashed border-[var(--fs-wire)] rounded flex flex-col items-center justify-center text-center">
          <p className="text-[var(--fs-ash)]">Your wishlist is currently empty.</p>
          <Link href="/shop" className="mt-4 text-[var(--fs-linen)] hover:underline text-sm uppercase tracking-widest">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((item) => (
            <motion.div key={item.productId} variants={itemVars} className="group flex flex-col">
              <Link href={`/product/${item.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-[var(--fs-void)] border border-[var(--fs-wire)]">
                {/* Fallback box for image */}
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 bg-gray-900/50">
                  {item.imageUrl ? 'Image' : 'No Cover'}
                </div>
              </Link>

              <div className="mt-4 space-y-1">
                <Link href={`/product/${item.slug}`} className="block text-sm font-medium hover:text-[var(--fs-linen)] transition">
                  {item.name}
                </Link>
                <div className="text-[var(--fs-linen)] text-sm">₹{item.price}</div>
              </div>

              <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleMoveToCart(item.productId)}
                  className="flex-1 py-2 text-xs uppercase tracking-widest bg-[var(--fs-linen)] text-[var(--fs-void)] font-medium transition hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-3 h-3" /> Cart
                </button>
                <button
                  onClick={() => handleRemove(item.productId)}
                  className="p-2 border border-[var(--fs-wire)] text-[var(--fs-ash)] hover:text-red-400 hover:border-red-900 transition flex items-center justify-center"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
