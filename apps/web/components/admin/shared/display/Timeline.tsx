'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

interface TimelineEvent {
  status: string;
  timestamp: string;
  actor: string;
  note?: string | null;
}

export const Timeline = memo(function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((evt, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: i < events.length - 1 ? '16px' : 0 }}>
          {/* Line */}
          {i < events.length - 1 && (
            <div style={{ position: 'absolute', left: '7px', top: '14px', bottom: 0, width: '1px', background: THEME.colors.ghost }} />
          )}
          {/* Dot */}
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: i === 0 ? THEME.colors.linen : THEME.colors.ghost, border: `1px solid ${i === 0 ? THEME.colors.linen : THEME.colors.border2}`, flexShrink: 0, marginTop: '2px', zIndex: 1 }} />
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 500 }}>{evt.status}</span>
              <span style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>· {evt.actor}</span>
            </div>
            <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.muted, fontFamily: THEME.fonts.mono, marginTop: '2px' }}>{new Date(evt.timestamp).toLocaleString('en-IN')}</div>
            {evt.note && <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui, marginTop: '3px' }}>{evt.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
});
