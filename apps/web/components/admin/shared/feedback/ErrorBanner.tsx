'use client';

import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import { mapError } from '@/lib/admin/errors';
import { ActionButton } from '../forms/ActionButton';

interface ErrorBannerProps {
  message: string | any;
  onRetry?: () => void;
}

export const ErrorBanner = memo(function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div style={{ 
      background: 'rgba(224,85,69,0.08)', 
      border: `1px solid rgba(224,85,69,0.25)`, 
      borderRadius: THEME.radius.lg, 
      padding: `${THEME.spacing.md} ${THEME.spacing.lg}`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      gap: THEME.spacing.md 
    }}>
      <span style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.error, fontFamily: THEME.fonts.ui, fontWeight: 500 }}>
        {mapError(message)}
      </span>
      {onRetry && (
        <ActionButton variant="ghost" onClick={onRetry} style={{ padding: '4px 12px', fontSize: THEME.fontSizes.sm }}>
          Retry
        </ActionButton>
      )}
    </div>
  );
});
