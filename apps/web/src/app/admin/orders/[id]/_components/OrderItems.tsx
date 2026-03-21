'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Order } from '@/lib/admin/types';
import { SectionCard, formatCurrency } from '@/components/admin/shared';

interface OrderItemsProps {
  items: Order['items'];
}

export function OrderItems({ items }: OrderItemsProps) {
  return (
    <SectionCard title="Items">
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: THEME.spacing.md }}>
            <div>
              <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base }}>{item.productName}</div>
              <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
                {item.fabricType} · {item.size} · {item.colour} · {item.sku}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base }}>{formatCurrency(item.unitPrice)}</div>
              <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs }}>Qty {item.qty}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
