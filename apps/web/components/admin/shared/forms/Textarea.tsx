'use client';

import React, { memo } from 'react';
import { THEME, css } from '@/lib/admin/theme';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
  ariaLabel?: string;
}

export const Textarea = memo(function Textarea({ hasError, ariaLabel, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      aria-label={ariaLabel}
      className="fs-focus"
      style={{
        ...css.input,
        resize: 'vertical',
        minHeight: '80px',
        lineHeight: '1.5',
        border: hasError ? `1px solid ${THEME.colors.error}` : undefined,
        background: hasError ? 'rgba(224,85,69,0.05)' : css.input.background,
      }}
    />
  );
});
