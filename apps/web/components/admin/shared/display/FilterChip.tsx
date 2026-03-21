'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
}

export const FilterChip = memo(function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-focus"
      aria-pressed={active}
      style={{
        background: active ? 'rgba(201,169,110,0.15)' : 'transparent',
        border: `1px solid ${active ? THEME.colors.linen : THEME.colors.border2}`,
        color: active ? THEME.colors.linen : THEME.colors.ash,
        padding: '5px 12px',
        borderRadius: THEME.radius.pill,
        fontSize: THEME.fontSizes.xs,
        cursor: 'pointer',
        fontFamily: THEME.fonts.ui,
        display: 'flex',
        alignItems: 'center',
        gap: THEME.spacing.sm,
        transition: 'all 0.15s ease',
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
      {count !== undefined && (
        <span aria-label={`${count} items`} style={{ opacity: 0.7, fontSize: '10px', fontWeight: 400 }}>{count}</span>
      )}
    </button>
  );
});
