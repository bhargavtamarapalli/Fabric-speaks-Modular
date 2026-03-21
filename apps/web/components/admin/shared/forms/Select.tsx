'use client';

import React, { memo } from 'react';
import { THEME, css } from '@/lib/admin/theme';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  ariaLabel?: string;
}

export const Select = memo(function Select({ hasError, ariaLabel, ...props }: SelectProps) {
  return (
    <select
      {...props}
      aria-label={ariaLabel}
      className="fs-focus"
      style={{
        ...css.input,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23444' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '28px',
        cursor: 'pointer',
        ...(hasError ? { border: `1px solid ${THEME.colors.error}` } : {}),
        background: hasError ? 'rgba(224,85,69,0.05)' : css.input.background,
      }}
    />
  );
});
