'use client';

import React, { memo } from 'react';
import { Skeleton } from './Skeleton';
import { SectionCard } from '../display/SectionCard';
import { DataTableSkeleton } from './TableSkeletons';

export const DetailsSkeleton = memo(function DetailsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionCard title="Details">
          <Skeleton lines={4} />
        </SectionCard>
        <SectionCard title="Table">
          <DataTableSkeleton rows={3} />
        </SectionCard>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionCard title="Status">
          <Skeleton variant="rectangular" height="40px" />
          <Skeleton variant="text" lines={2} style={{ marginTop: '12px' }} />
        </SectionCard>
      </div>
    </div>
  );
});
