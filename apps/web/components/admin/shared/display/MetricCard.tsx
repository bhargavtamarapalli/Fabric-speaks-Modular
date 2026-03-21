'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

/**
 * A card for displaying high-level metrics with optional delta indicators.
 */
interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  accent?: 'linen' | 'error' | 'success' | 'warning';
  onClick?: () => void;
}

export const MetricCard = memo(function MetricCard({ label, value, delta, deltaLabel, accent, onClick }: MetricCardProps) {
  const accentColor = {
    linen: THEME.colors.linen,
    error: THEME.colors.error,
    success: THEME.colors.success,
    warning: THEME.colors.warning,
  }[accent ?? 'linen'];

  const borderColor = accent
    ? (() => {
        const cleanHex = accentColor.replace('#', '');
        const match = cleanHex.match(/.{2}/g);
        if (!match) return THEME.colors.border;
        const rgb = match.map(h => {
          const parsed = parseInt(h, 16);
          return isNaN(parsed) ? 128 : parsed;
        }).join(',');
        return `rgba(${rgb}, 0.25)`;
      })()
    : THEME.colors.border;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${label}: ${value}. Click for details.` : undefined}
      style={{
        background: THEME.colors.surface3,
        border: `1px solid ${borderColor}`,
        borderRadius: THEME.radius.lg,
        padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      className={onClick ? 'fs-card-hover fs-focus' : ''}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: THEME.fonts.ui }}>{label}</div>
      <div style={{ fontSize: THEME.fontSizes.xl, color: accentColor ?? THEME.colors.ivory, margin: `${THEME.spacing.xs} 0`, fontFamily: THEME.fonts.display }}>{value}</div>
      {delta !== undefined && (
        <div 
          aria-label={`${delta >= 0 ? 'Increase' : 'Decrease'} of ${Math.abs(delta)}% ${deltaLabel ?? 'vs yesterday'}`}
          style={{ fontSize: THEME.fontSizes.sm, color: delta >= 0 ? THEME.colors.success : THEME.colors.error, fontFamily: THEME.fonts.ui, fontWeight: 500 }}
        >
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% <span style={{ color: THEME.colors.muted, fontWeight: 400 }}>{deltaLabel ?? 'vs yesterday'}</span>
        </div>
      )}
    </div>
  );
});
