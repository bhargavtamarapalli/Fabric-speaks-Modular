'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Order } from '@/lib/admin/types';
import { SectionCard } from '@/components/admin/shared';

interface CustomerInfoProps {
  customer: Order['customer'];
}

export function CustomerInfo({ customer }: CustomerInfoProps) {
  return (
    <SectionCard title="Customer">
      <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base }}>
        {customer.name}
      </div>
      <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
        {customer.mobile}
      </div>
      <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm, marginTop: THEME.spacing.xs }}>
        {customer.address.line1}, {customer.address.city}
      </div>
    </SectionCard>
  );
}
