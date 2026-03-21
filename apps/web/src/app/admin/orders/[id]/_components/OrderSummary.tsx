'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Order } from '@/lib/admin/types';
import { SectionCard, Badge, formatCurrency } from '@/components/admin/shared';

const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURN_REQUESTED: 'warning',
  RETURN_PICKED: 'warning',
  RETURN_RECEIVED: 'warning',
  REFUNDED: 'refunded',
};

interface OrderSummaryProps {
  order: Order;
}

export function OrderSummary({ order }: OrderSummaryProps) {
  return (
    <SectionCard title="Order Summary" accent>
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Status</span>
          <Badge type={(STATUS_BADGE[order.status] ?? 'draft') as any}>
            {order.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Payment</span>
          <span style={{ color: THEME.colors.ivory }}>{order.paymentMethod}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Subtotal</span>
          <span style={{ color: THEME.colors.ivory }}>{formatCurrency(order.subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Discount</span>
          <span style={{ color: THEME.colors.ivory }}>{formatCurrency(order.discount)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Shipping</span>
          <span style={{ color: THEME.colors.ivory }}>{formatCurrency(order.shipping)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: THEME.colors.ash }}>Total</span>
          <span style={{ color: THEME.colors.linen, fontFamily: THEME.fonts.ui }}>
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>
    </SectionCard>
  );
}
