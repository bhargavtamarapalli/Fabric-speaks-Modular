'use client';

import React, { memo } from 'react';
import { THEME, type BadgeType } from '@/lib/admin/theme';

interface BadgeProps {
  type: BadgeType;
  label?: string;
  children?: React.ReactNode;
}

export const Badge = memo(function Badge({ type, label, children }: BadgeProps) {
  const style = THEME.badgeStyles[type] ?? THEME.badgeStyles.draft;
  return (
    <span 
      role="status"
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: THEME.radius.sm,
        fontSize: THEME.fontSizes.xs,
        letterSpacing: '0.04em',
        fontFamily: THEME.fonts.ui,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? children}
    </span>
  );
});
