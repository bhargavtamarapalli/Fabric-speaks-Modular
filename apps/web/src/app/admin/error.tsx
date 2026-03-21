'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/admin/error.tsx
// Admin-specific error boundary.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { THEME, css } from '@/lib/admin/theme';
import { ActionButton } from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin Segment Error:', error);
  }, [error]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      background: THEME.colors.bg,
      color: THEME.colors.ivory,
      fontFamily: THEME.fonts.ui,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '20px',
        opacity: 0.5,
      }}>
        ⚠
      </div>
      
      <h1 style={{
        fontSize: THEME.fontSizes.lg,
        fontFamily: THEME.fonts.display,
        marginBottom: '10px',
        color: THEME.colors.linen,
      }}>
        Something went wrong in the Admin Panel
      </h1>

      <p style={{
        fontSize: THEME.fontSizes.base,
        color: THEME.colors.ash,
        maxWidth: '400px',
        lineHeight: 1.6,
        marginBottom: '24px',
      }}>
        {mapError(error)}
        <br />
        <span style={{ fontSize: '10px', opacity: 0.4 }}>Digest: {error.digest}</span>
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <ActionButton onClick={() => reset()} variant="primary">
          Try again
        </ActionButton>
        <ActionButton onClick={() => window.location.href = '/admin/dashboard'} variant="ghost">
          Return to Dashboard
        </ActionButton>
      </div>
    </div>
  );
}
