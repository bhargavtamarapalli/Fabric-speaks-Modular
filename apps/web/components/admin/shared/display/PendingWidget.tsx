'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import { Badge } from './Badge';

interface PendingWidgetProps {
  label: string;
  count: number;
  rows: { left: string; right: string }[];
  onClick: () => void;
}

export const PendingWidget = memo(function PendingWidget({ label, count, rows, onClick }: PendingWidgetProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: THEME.colors.surface3,
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      className="fs-card-hover fs-focus"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: THEME.spacing.sm }}>
        <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: THEME.fonts.ui }}>{label}</div>
        <Badge type="pending">{count}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.xs }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{row.left}</span>
            <span style={{ color: THEME.colors.muted, flexShrink: 0, marginLeft: '8px' }}>{row.right}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
