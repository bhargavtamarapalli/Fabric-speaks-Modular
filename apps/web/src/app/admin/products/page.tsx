'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  ConfirmModal,
} from '@/components/admin/shared';

import dynamic from 'next/dynamic';
import { useProducts } from './_hooks/useProducts';
import { ProductFilters } from './_components/ProductFilters';
import { ProductsGridSkeleton } from '@/components/admin/shared';

const ProductsDataGrid = dynamic(
  () => import('./_components/ProductsDataGrid').then(mod => mod.ProductsDataGrid),
  { loading: () => <ProductsGridSkeleton count={8} /> }
);

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

  const handleAddProduct = React.useCallback(() => {
    router.push('/admin/products/new');
  }, [router]);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} products`}
        action={
          <ActionButton onClick={handleAddProduct}>
            + Add product
          </ActionButton>
        }
      />

      {error && (
        <div style={{ marginBottom: THEME.spacing.md }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <ProductFilters 
        filters={filters} 
        onFilterChange={updateFilters} 
      />

      <ProductsDataGrid
        products={products}
        loading={loading}
        hoverId={hoverId}
        onHover={setHoverId}
        onRemove={setDeleteId}
      />

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
