'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

export const MonoText = memo(function MonoText({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily: THEME.fonts.mono, fontSize: THEME.fontSizes.sm, color: color ?? THEME.colors.linen }}>
      {children}
    </span>
  );
});
