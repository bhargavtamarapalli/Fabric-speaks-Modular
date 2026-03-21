'use client';

import React, { memo } from 'react';
import { THEME, css } from '@/lib/admin/theme';

/**
 * A container card for sections of content.
 */
interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  fullBleed?: boolean;
  noPadding?: boolean;
  accent?: boolean;
}

export const SectionCard = memo(function SectionCard({ title, children, action, footer, fullBleed, noPadding, accent }: SectionCardProps) {
  const contentPadding = fullBleed || noPadding ? 0 : THEME.spacing.lg;
 
  return (
    <div style={{
      ...css.card,
      background: accent ? 'rgba(201,169,110,0.05)' : css.card.background,
    }}>
      {(title || action) && (
        <div style={css.sectionHeader}>
          <span style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 600 }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding: contentPadding }}>{children}</div>
      {footer && (
        <div style={{ padding: `${THEME.spacing.md} ${THEME.spacing.lg}`, borderTop: `1px solid ${THEME.colors.border}`, background: 'rgba(255,255,255,0.02)' }}>
          {footer}
        </div>
      )}
    </div>
  );
});
