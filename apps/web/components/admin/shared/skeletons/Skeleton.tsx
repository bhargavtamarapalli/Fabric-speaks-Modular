'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  lines?: number;
  style?: React.CSSProperties;
}

export const Skeleton = memo(function Skeleton({ variant = 'text', width, height, lines = 1, style }: SkeletonProps) {
  const baseStyle = {
    background: `linear-gradient(90deg, ${THEME.colors.surface2} 25%, ${THEME.colors.ghost} 50%, ${THEME.colors.surface2} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'fs-skeleton-shimmer 1.5s infinite',
    borderRadius: variant === 'circular' ? '50%' : THEME.radius.md,
    width: variant !== 'circular' && width ? width : undefined,
    height: height ?? (variant === 'circular' ? '40px' : variant === 'rectangular' ? '80px' : '16px'),
    ...style,
  };

  if (variant === 'circular') {
    return (
      <>
        <div style={{ ...baseStyle, width: baseStyle.height }} />
        <style>{
          `@keyframes fs-skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
        </style>
      </>
    );
  }

  if (lines > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: width ?? '100%' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...baseStyle,
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
        <style>{`
          @keyframes fs-skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div style={baseStyle} />
      <style>{`
        @keyframes fs-skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
});
