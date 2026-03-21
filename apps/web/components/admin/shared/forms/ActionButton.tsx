'use client';

import React, { memo } from 'react';
import { THEME, css } from '@/lib/admin/theme';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

export const ActionButton = memo(function ActionButton({ variant = 'primary', loading, fullWidth, children, type, ...props }: ActionButtonProps) {
  const baseStyle = variant === 'danger' ? css.dangerBtn : variant === 'ghost' ? css.ghostBtn : css.actionBtn;
  return (
    <button
      {...props}
      type={type ?? 'button'}
      disabled={loading || props.disabled}
      className="fs-focus"
      aria-busy={loading}
      style={{
        ...baseStyle,
        opacity: (loading || props.disabled) ? 0.6 : 1,
        display: (fullWidth || props.style?.display) ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : props.style?.width,
        alignItems: 'center',
        justifyContent: 'center',
        gap: THEME.spacing.sm,
        ... (props.style || {}),
      }}
    >
      {loading && <span className="fs-spin-mini" aria-hidden="true">⟳</span>}
      <style>{`
        @keyframes fs-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .fs-spin-mini {
          display: inline-block;
          animation: fs-spin 0.8s linear infinite;
        }
      `}</style>
      {children}
    </button>
  );
});
