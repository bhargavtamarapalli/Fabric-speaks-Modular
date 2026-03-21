'use client';

import React, { memo, useRef, useEffect } from 'react';
import { THEME } from '@/lib/admin/theme';
import { ActionButton } from '../forms/ActionButton';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

/**
 * Centered confirmation modal for destructive or important actions.
 */
export const ConfirmModal = memo(function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger, loading }: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Store previously focused element
    previousActiveRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element in modal
    const focusableElements = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0];
    firstElement?.focus();

    // Get all focusable elements for tab cycling
    const focusableArray = Array.from(focusableElements ?? []);
    const firstFocusable = focusableArray[0];
    const lastFocusable = focusableArray[focusableArray.length - 1];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;

      // Trap focus within modal
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously active element
      previousActiveRef.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          position: 'relative',
          background: THEME.colors.surface,
          border: `1px solid ${THEME.colors.border}`,
          borderRadius: THEME.radius.lg,
          width: '100%',
          maxWidth: '400px',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        <div style={{ padding: '20px' }}>
          <h3 id="modal-title" style={{ fontSize: THEME.fontSizes.md, color: THEME.colors.ivory, fontFamily: THEME.fonts.display, margin: '0 0 10px' }}>{title}</h3>
          <p style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ash, fontFamily: THEME.fonts.ui, lineHeight: 1.5, margin: 0 }}>{message}</p>
        </div>
        <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderTop: `1px solid ${THEME.colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: THEME.spacing.sm }}>
          <ActionButton variant="ghost" onClick={onCancel}>Cancel</ActionButton>
          <ActionButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
});
