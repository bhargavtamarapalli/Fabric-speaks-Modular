'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

const DEFAULT_LABEL = 'Toggle';

export const Toggle = memo(function Toggle({ checked, onChange, label }: ToggleProps) {
  const accessibleLabel = label ?? DEFAULT_LABEL;
  return (
    <div
      onClick={() => onChange(!checked)}
      className="fs-focus"
      tabIndex={0}
      role="switch"
      aria-checked={checked}
      aria-label={accessibleLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={{
        width: '32px',
        height: '18px',
        background: checked ? THEME.colors.success : THEME.colors.ghost,
        borderRadius: '9px',
        padding: '2px',
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div 
        aria-hidden="true"
        style={{
          width: '14px',
          height: '14px',
          background: '#fff',
          borderRadius: '50%',
          transform: checked ? 'translateX(14px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }} 
      />
    </div>
  );
});
