'use client';

import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { THEME } from '@/lib/admin/theme';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation modal for destructive actions
 * Requires user confirmation before proceeding
 */
export const ConfirmModal = memo(function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Handle escape key to close modal - must be called unconditionally before any early returns
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        style={{
          background: THEME.colors.surface3,
          border: `1px solid ${THEME.colors.border}`,
          borderRadius: THEME.radius.lg,
          padding: THEME.spacing.lg,
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-start' }}>
          <AlertCircle
            size={24}
            style={{
              color: isDestructive ? THEME.colors.error : THEME.colors.warning,
              flexShrink: 0,
              marginTop: '2px',
            }}
          />
          <h2 style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.lg, fontFamily: THEME.fonts.ui, fontWeight: 600, margin: 0 }}>
            {title}
          </h2>
        </div>

        {/* Message */}
        <p style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui, margin: '0 0 20px 36px', lineHeight: '1.5' }}>
          {message}
        </p>

        {/* Button Group */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginLeft: '36px' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radius.md,
              color: THEME.colors.linen,
              fontSize: THEME.fontSizes.sm,
              fontFamily: THEME.fonts.ui,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: isDestructive ? THEME.colors.error : THEME.colors.linen,
              color: isDestructive ? 'white' : '#1a1a1a',
              border: 'none',
              borderRadius: THEME.radius.md,
              fontSize: THEME.fontSizes.sm,
              fontFamily: THEME.fonts.ui,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

ConfirmModal.displayName = 'ConfirmModal';
