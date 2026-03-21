'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import { mapError } from '@/lib/admin/errors';

/**
 * Wrapper for form fields that adds labels, errors, and helper text.
 * Uses aria-describedby for accessibility.
 */
interface FormFieldProps {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
  errorId?: string;
}

export const FormField = memo(function FormField({ label, error, helper, required, children, errorId }: FormFieldProps) {
  const generatedId = React.useId();
  const effectiveErrorId = errorId || `err-${generatedId}`;
  const hasError = !!error;

  // Enhance children with id and error indicators
  const id = children && React.isValidElement(children) ? (children.props as any).id || `input-${generatedId}` : `input-${generatedId}`;
  
  const childWithProps = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{
      id?: string;
      'aria-invalid'?: string;
      'aria-describedby'?: string;
      'aria-required'?: string;
      hasError?: boolean;
    }>, {
      id,
      'aria-invalid': hasError ? 'true' : 'false',
      'aria-describedby': hasError ? effectiveErrorId : (helper ? `help-${generatedId}` : undefined),
      'aria-required': required ? 'true' : undefined,
      hasError,
    })
    : children;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.xs }}>
      <label
        htmlFor={id}
        style={{
          fontSize: THEME.fontSizes.sm,
          color: hasError ? THEME.colors.error : THEME.colors.ash,
          fontFamily: THEME.fonts.ui,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <span>
          {label}
          {required && <span style={{ color: THEME.colors.error, marginLeft: '4px' }} aria-hidden="true">*</span>}
        </span>
      </label>
      
      {childWithProps}
      
      {helper && !error && (
        <span 
          id={`help-${generatedId}`}
          style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginTop: '2px' }}
        >
          {helper}
        </span>
      )}
      
      <div 
        style={{ 
          minHeight: '18px', 
          overflow: 'hidden',
          transition: 'all 0.2s ease-in-out',
          marginTop: hasError ? '2px' : '-4px',
          opacity: hasError ? 1 : 0,
        }}
      >
        {error && (
          <span 
            id={effectiveErrorId} 
            role="alert" 
            style={{ 
              fontSize: '11px', 
              color: THEME.colors.error, 
              fontFamily: THEME.fonts.ui,
              display: 'block',
              fontWeight: 500,
            }}
          >
            {mapError(error)}
          </span>
        )}
      </div>
    </div>
  );
});
