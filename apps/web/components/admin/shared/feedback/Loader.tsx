'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

interface LoaderProps {
  size?: number;
}

export const Loader = memo(function Loader({ size = 24 }: LoaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${THEME.colors.ghost}`,
        borderTop: `2px solid ${THEME.colors.linen}`,
        borderRadius: '50%',
        animation: 'fs-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes fs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});
