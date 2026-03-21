'use client';

// app/admin/returns/[id]/page.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { returnsApi } from '@/lib/admin/api';
import type { Return, ReturnTimeline, RefundStatus } from '@/lib/admin/types';
import { THEME } from '@/lib/admin/theme';
import {
  PageHeader,
  SectionCard,
  Badge,
  ActionButton,
  ErrorBanner,
  Loader,
  Timeline,
  MonoText,
  formatCurrency,
  formatDateTime,
  useToast,
} from '@/components/admin/shared';

const RETURN_BADGE: Record<string, string> = {
  RETURN_REQUESTED: 'pending',
  APPROVED: 'confirmed',
  PICKUP_SCHEDULED: 'processing',
  RETURN_PICKED: 'processing',
  RETURN_RECEIVED: 'warning',
  REFUND_INITIATED: 'warning',
  REFUNDED: 'refunded',
  REPLACEMENT_SENT: 'shipped',
};

export default function ReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast, ToastComponent } = useToast();

  const returnId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [ret, setRet] = useState<Return | null>(null);
  const [timeline, setTimeline] = useState<ReturnTimeline[]>([]);
  const [refund, setRefund] = useState<RefundStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!returnId) return;
    try {
      setError(null);
      setLoading(true);
      const [retRes, timeRes, refundRes] = await Promise.all([
        returnsApi.getById(returnId),
        returnsApi.getTimeline(returnId),
        returnsApi.getRefundStatus(returnId),
      ]);
      setRet(retRes);
      setTimeline(timeRes);
      setRefund(refundRes);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load return');
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => { load(); }, [load]);

  const handleCopyRefundId = async () => {
    if (!refund?.razorpayRefundId) return;
    try {
      await navigator.clipboard.writeText(refund.razorpayRefundId);
      showToast('Refund ID copied', 'success');
    } catch {
      showToast('Failed to copy refund ID', 'error');
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!ret) return <ErrorBanner message="Return not found" onRetry={load} />;

  return (
    <div>
      <PageHeader
        title={`Return ${ret.orderNumber}`}
        subtitle={`Created ${formatDateTime(ret.createdAt)}`}
        action={<ActionButton variant="ghost" onClick={() => router.push('/admin/returns')}>Back to Returns</ActionButton>}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: THEME.spacing.lg,
        alignItems: 'start',
      }}>
        <div>
          <SectionCard title="Return Summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: THEME.colors.ash }}>Status</span>
                <Badge type={(RETURN_BADGE[ret.status] ?? 'draft') as any}>{ret.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: THEME.colors.ash }}>Resolution</span>
                <span style={{ color: THEME.colors.ivory }}>{ret.resolution ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: THEME.colors.ash }}>Reason</span>
                <span style={{ color: THEME.colors.ivory }}>{ret.reason}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: THEME.colors.ash }}>Days Open</span>
                <span style={{ color: THEME.colors.ivory }}>{ret.daysOpen}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Return Timeline">
            {timeline.length === 0 ? (
              <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base }}>No timeline events.</div>
            ) : (
              <Timeline events={timeline.map(t => ({
                status: t.status.replace(/_/g, ' '),
                timestamp: t.timestamp,
                actor: t.actor,
                note: t.note,
              }))} />
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Customer">
            <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base }}>{ret.customer.name}</div>
            <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{ret.customer.mobile}</div>
          </SectionCard>

          <SectionCard title="Refund Status">
            {!refund?.razorpayRefundId ? (
              <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base }}>Refund not initiated.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: THEME.colors.ash }}>Refund ID</span>
                  <MonoText>{refund.razorpayRefundId}</MonoText>
                </div>
                <ActionButton variant="ghost" onClick={handleCopyRefundId}>Copy Refund ID</ActionButton>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: THEME.colors.ash }}>Amount</span>
                  <span style={{ color: THEME.colors.ivory }}>{formatCurrency(refund.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: THEME.colors.ash }}>Status</span>
                  <span style={{ color: THEME.colors.ivory }}>{refund.status}</span>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Replacement">
            {ret.replacementOrderId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
                <div style={{ color: THEME.colors.ivory }}>
                  Replacement Order: <MonoText>{ret.replacementOrderNumber ?? ret.replacementOrderId}</MonoText>
                </div>
                <ActionButton variant="ghost" onClick={() => router.push(`/admin/orders/${ret.replacementOrderId}`)}>
                  Open Replacement Order
                </ActionButton>
              </div>
            ) : (
              <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base }}>No replacement order.</div>
            )}
          </SectionCard>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
