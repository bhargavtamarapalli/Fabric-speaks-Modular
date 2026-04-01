'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  DetailsSkeleton,
} from '@/components/admin/shared';

import { useProductDetail } from './_hooks/useProductDetail';
import { VariantList } from './_components/VariantList';
import { ProductInfo } from './_components/ProductInfo';
import { BulkUpdateDrawer } from './_components/BulkUpdateDrawer';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();

  const productId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const {
    product,
    loading,
    error,
    drawerOpen,
    setDrawerOpen,
    edits,
    updateEdit,
    errors,
    saving,
    handleBulkUpdate,
    adjustVariantStock,
    batchAdjustStock,
    load,
  } = useProductDetail(productId);

  if (loading) return <DetailsSkeleton />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  
  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>🔍</div>
        <h2 style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.display }}>Product Not Found</h2>
        <p style={{ color: THEME.colors.ash, marginBottom: '24px' }}>
          The product you are looking for does not exist or has been deleted.
        </p>
        <ActionButton onClick={() => router.push('/admin/products')}>
          Back to Products
        </ActionButton>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={`Created ${new Date(product.createdAt).toLocaleString('en-IN')}`}
        action={
          <ActionButton variant="ghost" onClick={() => router.push('/admin/products')}>
            Back to Products
          </ActionButton>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: THEME.spacing.lg,
        alignItems: 'start',
      }}>
        <div>
          <VariantList 
            product={product} 
            onBulkUpdate={() => setDrawerOpen(true)} 
            onRefresh={load}
          />
        </div>

        <div>
          <ProductInfo product={product} />
        </div>
      </div>

      <BulkUpdateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={product}
        edits={edits}
        onEditChange={updateEdit}
        errors={errors}
        onSave={handleBulkUpdate}
        saving={saving}
        onAdjustVariantStock={adjustVariantStock}
        onBatchAdjustStock={batchAdjustStock}
      />
    </div>
  );
}
