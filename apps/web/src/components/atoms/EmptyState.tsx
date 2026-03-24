'use client';
import { motion } from 'framer-motion';
import { PackageX, RefreshCw, SearchX, ShoppingBag } from 'lucide-react';

export type EmptyStateVariant = 'restocking' | 'no-results' | 'empty-cart' | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const VARIANTS: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; message: string }> = {
  restocking: {
    icon: <PackageX className="w-12 h-12 text-[var(--fs-ash)] mb-6" />,
    title: 'Restocking Soon',
    message: 'Our team is working on curating the next collection. Check back soon.',
  },
  'no-results': {
    icon: <SearchX className="w-12 h-12 text-[var(--fs-ash)] mb-6" />,
    title: 'No Results Found',
    message: 'Try adjusting your filters or search terms to find what you\'re looking for.',
  },
  'empty-cart': {
    icon: <ShoppingBag className="w-12 h-12 text-[var(--fs-ash)] mb-6" />,
    title: 'Your Cart is Empty',
    message: 'Explore our collection and find something you love.',
  },
  generic: {
    icon: <RefreshCw className="w-12 h-12 text-[var(--fs-ash)] mb-6" />,
    title: 'Nothing Here Yet',
    message: 'Content is on its way. Please check back later.',
  },
};

export function EmptyState({ variant = 'generic', title, message, actionLabel, onAction }: EmptyStateProps) {
  const config = VARIANTS[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      {/* Subtle radial glow behind icon */}
      <div className="relative mb-2">
        <div className="absolute inset-0 rounded-full bg-[var(--fs-linen)]/5 blur-2xl scale-150" />
        {config.icon}
      </div>

      <h3 className="font-serif text-2xl text-[var(--fs-ivory)] mb-3">
        {title ?? config.title}
      </h3>
      <p className="font-sans text-[var(--fs-ash)] max-w-sm text-sm leading-relaxed mb-8">
        {message ?? config.message}
      </p>

      {onAction && (
        <button
          onClick={onAction}
          className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-linen)] border-b border-[var(--fs-linen)] pb-0.5 hover:opacity-70 transition-opacity"
        >
          {actionLabel ?? 'Try Again'}
        </button>
      )}
    </motion.div>
  );
}
