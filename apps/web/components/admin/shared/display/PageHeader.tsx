'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

/**
 * Standard page header with title, optional subtitle, and primary action.
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader = memo(function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: THEME.spacing.lg }}>
      <div>
        <h1 style={{ fontSize: THEME.fontSizes.lg, color: THEME.colors.ivory, fontFamily: THEME.fonts.display, fontWeight: 'normal', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, margin: `${THEME.spacing.xs} 0 0`, fontFamily: THEME.fonts.ui }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, marginLeft: THEME.spacing.md }}>{action}</div>}
    </div>
  );
});
