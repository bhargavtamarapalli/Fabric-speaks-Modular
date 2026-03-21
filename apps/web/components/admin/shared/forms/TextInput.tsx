'use client';

import React, { memo } from 'react';
import { THEME, css } from '@/lib/admin/theme';

/**
 * Standard text input with optional prefix/suffix.
 * Use with FormField for full accessibility, or provide aria-label when used standalone.
 */
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
  suffix?: string;
  hasError?: boolean;
  ariaLabel?: string;
}

export const TextInput = memo(function TextInput({ prefix, suffix, style: _style, hasError, ariaLabel, ...props }: TextInputProps) {
  const inputStyle = {
    ...css.input,
    border: hasError ? `1px solid ${THEME.colors.error}` : undefined,
    background: hasError ? 'rgba(224,85,69,0.05)' : css.input.background,
  };

  if (prefix || suffix) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        background: hasError ? 'rgba(224,85,69,0.05)' : THEME.colors.bg, 
        border: `1px solid ${hasError ? THEME.colors.error : THEME.colors.border2}`, 
        borderRadius: THEME.radius.md, 
        overflow: 'hidden' 
      }}>
        {prefix && <span style={{ padding: `0 ${THEME.spacing.sm}`, color: THEME.colors.muted, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui, borderRight: `1px solid ${THEME.colors.ghost}`, height: '100%', display: 'flex', alignItems: 'center' }}>{prefix}</span>}
        <input {...props} aria-label={ariaLabel} className="fs-focus" style={inputStyle} />
        {suffix && <span style={{ padding: `0 ${THEME.spacing.sm}`, color: THEME.colors.muted, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui, borderLeft: `1px solid ${THEME.colors.ghost}`, height: '100%', display: 'flex', alignItems: 'center' }}>{suffix}</span>}
      </div>
    );
  }
  return <input {...props} aria-label={ariaLabel} className="fs-focus" style={inputStyle} />;
});
