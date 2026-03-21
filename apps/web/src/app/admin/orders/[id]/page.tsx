'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  DetailsSkeleton,
  ConfirmModal,
  formatDateTime,
} from '@/components/admin/shared';

import { useOrderDetail } from './_hooks/useOrderDetail';
import { OrderItems } from './_components/OrderItems';
import { OrderTimelineView } from './_components/OrderTimelineView';
import { OrderSummary } from './_components/OrderSummary';
import { CustomerInfo } from './_components/CustomerInfo';
import { CancelOrderDrawer } from './_components/CancelOrderDrawer';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();

  const orderId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const {
    order,
    timeline,
    loading,
    error,
    cancelOpen,
    setCancelOpen,
    confirmOpen,
    setConfirmOpen,
    cancelForm,
    setCancelForm,
    cancelErrors,
    setCancelErrors,
    cancelLoading,
    printLoading,
    handleCancelReview,
    handleCancelConfirm,
    handlePrint,
    load,
  } = useOrderDetail(orderId);

  if (loading) return <DetailsSkeleton />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>📦</div>
        <h2 style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.display }}>Order Not Found</h2>
        <p style={{ color: THEME.colors.ash, marginBottom: '24px' }}>
          The order you are looking for does not exist or has been deleted.
        </p>
        <ActionButton onClick={() => router.push('/admin/orders')}>
          Back to Orders
        </ActionButton>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`Placed ${formatDateTime(order.createdAt)}`}
        action={
          <ActionButton variant="ghost" onClick={() => router.push('/admin/orders')}>
            Back to Orders
          </ActionButton>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: THEME.spacing.lg,
        alignItems: 'start',
      }}>
        {/* Left column */}
        <div>
          <OrderItems items={order.items} />
          <OrderTimelineView timeline={timeline} />
        </div>

        {/* Right column */}
        <div>
          <OrderSummary order={order} />
          <CustomerInfo customer={order.customer} />

          <SectionCard title="Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
              <ActionButton onClick={handlePrint} loading={printLoading}>
                Print Packing Slip
              </ActionButton>
              <ActionButton variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel Order
              </ActionButton>
            </div>
          </SectionCard>
        </div>
      </div>

      <CancelOrderDrawer
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        form={cancelForm}
        onFormChange={patch => {
          setCancelForm(prev => ({ ...prev, ...patch }));
          if (patch.reason && cancelErrors['reason']) {
            setCancelErrors(prev => ({ ...prev, reason: '' }));
          }
        }}
        errors={cancelErrors}
        onReview={handleCancelReview}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Confirm cancellation"
        message={`Cancel this order? Reason: "${cancelForm.reason.trim() || 'N/A'}"`}
        onConfirm={handleCancelConfirm}
        onCancel={() => setConfirmOpen(false)}
        confirmLabel="Yes, cancel order"
        danger
        loading={cancelLoading}
      />
    </div>
  );
}

const SectionCard = ({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) => (
  <div style={{
    background: accent ? 'rgba(201,169,110,0.05)' : THEME.colors.surface3,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  }}>
    <h3 style={{
      color: THEME.colors.linen,
      fontFamily: THEME.fonts.display,
      fontSize: THEME.fontSizes.lg,
      marginBottom: THEME.spacing.md,
      marginTop: 0,
    }}>
      {title}
    </h3>
    {children}
  </div>
);
