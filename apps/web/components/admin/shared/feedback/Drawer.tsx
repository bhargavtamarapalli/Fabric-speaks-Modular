'use client';

import React, { memo, useRef, useEffect } from 'react';
import { THEME, css } from '@/lib/admin/theme';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

/**
 * Side-drawer component (Sidebar overlay) for forms and details.
 * Implements focus trapping for accessibility.
 */
export const Drawer = memo(function Drawer({ open, onClose, title, children, width = '400px' }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Store previously focused element
    previousActiveRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element in drawer
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
      // Handle Escape key to close drawer
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      // Trap focus within drawer
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

    // Trap focus - prevent clicking outside
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!panelRef.current?.contains(target)) {
        e.preventDefault();
        focusableArray[0]?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      // Restore focus to previously active element
      previousActiveRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width,
          maxWidth: '100vw',
          background: THEME.colors.surface,
          borderLeft: `1px solid ${THEME.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none',
        }}
        tabIndex={-1}
      >
        <div style={{ ...css.sectionHeader, flexShrink: 0 }}>
          <span id="drawer-title" style={{ fontSize: THEME.fontSizes.md, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 600 }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="fs-focus"
            style={{ background: 'none', border: 'none', color: THEME.colors.ash, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: THEME.spacing.xs, borderRadius: THEME.radius.sm }}
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: THEME.spacing.lg }}>{children}</div>
      </div>
    </div>
  );
});
