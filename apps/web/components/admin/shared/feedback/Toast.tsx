'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import { mapError } from '@/lib/admin/errors';

interface ToastProps {
  message: string | any;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast = memo(function Toast({ message, type, onClose }: ToastProps) {
  const colors = {
    success: { bg: 'rgba(45,106,79,0.1)', border: 'rgba(45,106,79,0.3)', color: THEME.colors.success },
    error: { bg: 'rgba(224,85,69,0.1)', border: 'rgba(224,85,69,0.3)', color: THEME.colors.error },
    info: { bg: 'rgba(88,166,255,0.1)', border: 'rgba(88,166,255,0.3)', color: THEME.colors.info },
  };

  return (
    <div 
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 200,
        background: THEME.colors.bg,
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '280px',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      <span style={{ color: colors[type].color, fontSize: '14px' }}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span style={{ flex: 1, fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>
        {type === 'error' ? mapError(message) : message}
      </span>
      <button 
        onClick={onClose} 
        aria-label="Close notification"
        style={{ background: 'none', border: 'none', color: THEME.colors.ash, cursor: 'pointer', fontSize: '16px' }}
      >
        ×
      </button>
    </div>
  );
});
