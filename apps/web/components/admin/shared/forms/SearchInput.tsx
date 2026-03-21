'use client';

import React, { memo } from 'react';
import { THEME, css } from '@/lib/admin/theme';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
}

export const SearchInput = memo(function SearchInput({ placeholder, value, onChange }: SearchInputProps) {
  return (
    <div style={{ position: 'relative', width: '240px' }}>
      <span 
        aria-hidden="true"
        style={{ position: 'absolute', left: THEME.spacing.sm, top: '50%', transform: 'translateY(-50%)', color: THEME.colors.muted, fontSize: '14px' }}
      >
        🔍
      </span>
      <input
        type="text"
        placeholder={placeholder ?? 'Search...'}
        value={value}
        className="fs-focus"
        aria-label={placeholder ?? 'Search items'}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...css.input,
          paddingLeft: '34px',
          background: THEME.colors.surface2,
          border: `1px solid ${THEME.colors.border}`,
          borderRadius: THEME.radius.lg,
        }}
      />
    </div>
  );
});
