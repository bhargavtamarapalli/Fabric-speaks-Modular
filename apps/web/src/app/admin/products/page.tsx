'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  ProductsGridSkeleton,
  ConfirmModal,
} from '@/components/admin/shared';

import { useProducts } from './_hooks/useProducts';
import { ProductFilters } from './_components/ProductFilters';
import { ProductCard } from './_components/ProductCard';

export default function ProductsPage() {
  const router = useRouter();
  const {
    products,
    loading,
    error,
    filters,
    updateFilters,
    deleteId,
    setDeleteId,
    delLoading,
    handleDelete,
    hoverId,
    setHoverId,
    load,
  } = useProducts({ search: '', fabric: 'All', status: 'All' });

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} products`}
        action={
          <ActionButton onClick={() => router.push('/admin/products/new')}>
            + Add product
          </ActionButton>
        }
      />

      {error && (
        <div style={{ marginBottom: '12px' }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <ProductFilters 
        filters={filters} 
        onFilterChange={updateFilters} 
      />

      {loading ? (
        <ProductsGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', border: `1px solid ${THEME.colors.border2}`, borderRadius: '50%' }} />
          <div style={{ color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>No products found</div>
          <ActionButton onClick={() => router.push('/admin/products/new')}>Add first product</ActionButton>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              isHovered={hoverId === p.id}
              onHover={setHoverId}
              onRemove={setDeleteId}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Remove product?"
        message="This will hide the product from the storefront. Existing orders are not affected."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Remove product"
        danger
        loading={delLoading}
      />
    </div>
  );
}
