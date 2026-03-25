'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { ActionButton, ProductsGridSkeleton } from '@/components/admin/shared';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/admin/types';

interface ProductsDataGridProps {
  products: Product[];
  loading: boolean;
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onRemove: (id: string) => void;
}

/**
 * A responsive grid display for products.
 * Handles loading skeletons, empty states, and individual product cards.
 */
export function ProductsDataGrid({
  products,
  loading,
  hoverId,
  onHover,
  onRemove,
}: ProductsDataGridProps) {
  const router = useRouter();

  if (loading) {
    return <ProductsGridSkeleton count={8} />;
  }

  if (products.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', border: `1px solid ${THEME.colors.border2}`, borderRadius: '50%' }} />
        <div style={{ color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>No products found</div>
        <ActionButton onClick={() => router.push('/admin/products/new')}>Add first product</ActionButton>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', 
      gap: THEME.spacing.sm,
      overflowX: 'auto',
      paddingBottom: '10px',
      WebkitOverflowScrolling: 'touch'
    }}>
      {products.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          isHovered={hoverId === p.id}
          onHover={onHover}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
