'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import type { OrderTimeline } from '@/lib/admin/types';
import { SectionCard, Timeline } from '@/components/admin/shared';

interface OrderTimelineViewProps {
  timeline: OrderTimeline[];
}

export function OrderTimelineView({ timeline }: OrderTimelineViewProps) {
  return (
    <SectionCard title="Order Timeline">
      {timeline.length === 0 ? (
        <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base }}>
          No timeline events.
        </div>
      ) : (
        <Timeline 
          events={timeline.map(t => ({
            status: t.status.replace(/_/g, ' '),
            timestamp: t.timestamp,
            actor: t.actor,
            note: t.note,
          }))} 
        />
      )}
    </SectionCard>
  );
}
