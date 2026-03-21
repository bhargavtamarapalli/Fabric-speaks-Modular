'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Shared Admin Components
// All components use THEME values only. Zero hardcoded colours.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, memo, useMemo } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { THEME, css, type BadgeType } from '../../../lib/admin/theme';
export { THEME, css, type BadgeType };
import { mapError } from '@/lib/admin/errors';

// ─── Badge ────────────────────────────────────────────────────────────────────

/**
 * A simple badge/tag component for status and labels.
 */
interface BadgeProps {
  type: BadgeType;
  label?: string;
  children?: React.ReactNode;
}

export const Badge = memo(function Badge({ type, label, children }: BadgeProps) {
  const style = THEME.badgeStyles[type] ?? THEME.badgeStyles.draft;
  return (
    <span 
      role="status"
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: THEME.radius.sm,
        fontSize: THEME.fontSizes.xs,
        letterSpacing: '0.04em',
        fontFamily: THEME.fonts.ui,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? children}
    </span>
  );
});

// ─── MetricCard ───────────────────────────────────────────────────────────────

/**
 * A card for displaying high-level metrics with optional delta indicators.
 */
interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  accent?: 'linen' | 'error' | 'success' | 'warning';
  onClick?: () => void;
}

export const MetricCard = memo(function MetricCard({ label, value, delta, deltaLabel, accent, onClick }: MetricCardProps) {
  const accentColor = {
    linen: THEME.colors.linen,
    error: THEME.colors.error,
    success: THEME.colors.success,
    warning: THEME.colors.warning,
  }[accent ?? 'linen'];

  const borderColor = accent
    ? `rgba(${accentColor.replace('#', '').match(/.{2}/g)!.map(h => parseInt(h, 16)).join(',')}, 0.25)`
    : THEME.colors.border;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${label}: ${value}. Click for details.` : undefined}
      style={{
        background: THEME.colors.surface3,
        border: `1px solid ${borderColor}`,
        borderRadius: THEME.radius.lg,
        padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      className={onClick ? 'fs-card-hover fs-focus' : ''}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: THEME.fonts.ui }}>{label}</div>
      <div style={{ fontSize: THEME.fontSizes.xl, color: accentColor ?? THEME.colors.ivory, margin: `${THEME.spacing.xs} 0`, fontFamily: THEME.fonts.display }}>{value}</div>
      {delta !== undefined && (
        <div 
          aria-label={`${delta >= 0 ? 'Increase' : 'Decrease'} of ${Math.abs(delta)}% ${deltaLabel ?? 'vs yesterday'}`}
          style={{ fontSize: THEME.fontSizes.sm, color: delta >= 0 ? THEME.colors.success : THEME.colors.error, fontFamily: THEME.fonts.ui, fontWeight: 500 }}
        >
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% <span style={{ color: THEME.colors.muted, fontWeight: 400 }}>{deltaLabel ?? 'vs yesterday'}</span>
        </div>
      )}
    </div>
  );
});

// ─── PageHeader ───────────────────────────────────────────────────────────────

/**
 * Standard page header with title, optional subtitle, and primary action.
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader = memo(function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: THEME.spacing.lg }}>
      <div>
        <h1 style={{ fontSize: THEME.fontSizes.lg, color: THEME.colors.ivory, fontFamily: THEME.fonts.display, fontWeight: 'normal', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, margin: `${THEME.spacing.xs} 0 0`, fontFamily: THEME.fonts.ui }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, marginLeft: THEME.spacing.md }}>{action}</div>}
    </div>
  );
});

// ─── SectionCard ──────────────────────────────────────────────────────────────

/**
 * A container card for sections of content.
 */
interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  fullBleed?: boolean;
  noPadding?: boolean;
  accent?: boolean;
}

export const SectionCard = memo(function SectionCard({ title, children, action, footer, fullBleed, noPadding, accent }: SectionCardProps) {
  const contentPadding = fullBleed || noPadding ? 0 : THEME.spacing.lg;
 
  return (
    <div style={{
      ...css.card,
      background: accent ? 'rgba(201,169,110,0.05)' : css.card.background,
    }}>
      {(title || action) && (
        <div style={css.sectionHeader}>
          <span style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 600 }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding: contentPadding }}>{children}</div>
      {footer && (
        <div style={{ padding: `${THEME.spacing.md} ${THEME.spacing.lg}`, borderTop: `1px solid ${THEME.colors.border}`, background: 'rgba(255,255,255,0.02)' }}>
          {footer}
        </div>
      )}
    </div>
  );
});

// ─── PendingWidget ────────────────────────────────────────────────────────────

/**
 * A specialized widget for showing pending counts and recent items.
 */
interface PendingWidgetProps {
  label: string;
  count: number;
  rows: { left: string; right: string }[];
  onClick: () => void;
}

export const PendingWidget = memo(function PendingWidget({ label, count, rows, onClick }: PendingWidgetProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: THEME.colors.surface3,
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      className="fs-card-hover fs-focus"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: THEME.spacing.sm }}>
        <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: THEME.fonts.ui }}>{label}</div>
        <Badge type="pending">{count}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.xs }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{row.left}</span>
            <span style={{ color: THEME.colors.muted, flexShrink: 0, marginLeft: '8px' }}>{row.right}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── FilterChip ───────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
}

export const FilterChip = memo(function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="fs-focus"
      aria-pressed={active}
      style={{
        background: active ? 'rgba(201,169,110,0.15)' : 'transparent',
        border: `1px solid ${active ? THEME.colors.linen : THEME.colors.border2}`,
        color: active ? THEME.colors.linen : THEME.colors.ash,
        padding: '5px 12px',
        borderRadius: THEME.radius.pill,
        fontSize: THEME.fontSizes.xs,
        cursor: 'pointer',
        fontFamily: THEME.fonts.ui,
        display: 'flex',
        alignItems: 'center',
        gap: THEME.spacing.sm,
        transition: 'all 0.15s ease',
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
      {count !== undefined && (
        <span aria-label={`${count} items`} style={{ opacity: 0.7, fontSize: '10px', fontWeight: 400 }}>{count}</span>
      )}
    </button>
  );
});

// ─── SearchInput ──────────────────────────────────────────────────────────────

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

// ─── DataTable ────────────────────────────────────────────────────────────────

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowKey?: keyof T | ((row: T) => string);
  empty?: string;
}

/**
 * Optimized row component for DataTable to prevent unnecessary re-renders.
 */
const DataTableRow = memo(function DataTableRow({ 
  row, 
  columns, 
  onRowClick, 
  isVirtual
}: { row: any; columns: Column<any>[]; onRowClick?: (row: any) => void; isVirtual?: boolean }) {
  const Component = isVirtual ? 'div' : 'tr';
  const CellComponent = isVirtual ? 'div' : 'td';

  return (
    <Component
      onClick={() => onRowClick?.(row)}
      onKeyDown={onRowClick ? (e: any) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick(row);
        }
      } : undefined}
      tabIndex={onRowClick ? 0 : undefined}
      style={{
        cursor: onRowClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
        display: isVirtual ? 'flex' : undefined,
        alignItems: isVirtual ? 'center' : undefined,
      }}
      className={`fs-table-row ${onRowClick ? 'fs-focus' : ''}`}
      role="row"
    >
      {columns.map((col) => (
        <CellComponent 
          key={col.key as string} 
          style={{
            ...css.tableCell,
            width: col.width,
            flexGrow: (isVirtual && !col.width) ? 1 : 0,
            flexShrink: 0,
          }}
          role="cell"
        >
          {col.render ? col.render(row) : (row[col.key] as any)}
        </CellComponent>
      ))}
    </Component>
  );
});

const VirtualizedDataTableRow = memo(function VirtualizedDataTableRow({ 
  index, 
  style, 
  ariaAttributes,
  items,
  columns,
  onRowClick
}: { index: number; style: any; ariaAttributes: any; items: any[]; columns: any[]; onRowClick?: (row: any) => void }) {
  const row = items[index];
  return (
    <div style={style} {...ariaAttributes}>
      <DataTableRow
        row={row}
        columns={columns}
        onRowClick={onRowClick}
        isVirtual
      />
    </div>
  );
});

/**
 * A standard data table for admin lists.
 */
export const DataTable = memo(function DataTable<T>({ 
  columns, 
  data, 
  loading, 
  onRowClick, 
  rowKey = 'id' as keyof T, 
  empty = "No items found." 
}: DataTableProps<T>) {
  if (loading) return <DataTableSkeleton />;
  if (!data?.length) return <div style={{ padding: THEME.spacing.xxl, textAlign: 'center', color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{empty}</div>;

  const isVirtualized = data.length > 100;

  if (isVirtualized) {
    return (
      <div style={{ height: '500px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${THEME.colors.border}`, paddingBottom: THEME.spacing.sm, marginBottom: THEME.spacing.sm }}>
          {columns.map(col => (
            <div key={col.key as string} style={{ ...css.tableHeader, width: col.width, flexGrow: col.width ? 0 : 1, flexShrink: 0 }}>
              {col.label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <AutoSizer
            renderProp={({ height, width }) => (
              <List
                style={{ height: height ?? 500, width: width ?? '100%' }}
                rowCount={data.length}
                rowHeight={64}
                rowComponent={VirtualizedDataTableRow as any}
                rowProps={{
                  items: data,
                  columns,
                  onRowClick
                }}
              />
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table role="grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr role="row">
            {columns.map((col) => (
              <th 
                key={col.key as string} 
                role="columnheader"
                style={{ ...css.tableHeader, width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const key = typeof rowKey === 'function'
              ? rowKey(row)
              : (row[rowKey] as unknown as string) || `row-${idx}`;

            return (
              <DataTableRow
                key={key}
                row={row}
                columns={columns}
                onRowClick={onRowClick}
              />
            );
          })}
        </tbody>
      </table>
      <style jsx global>{`
        .fs-table-row:hover { background: rgba(255,255,255,0.03); }
        .fs-focus:focus-visible { 
          outline: none; 
          box-shadow: 0 0 0 2px rgba(201,169,110,0.45) !important;
          border-color: #C9A96E !important;
          z-index: 10;
          position: relative;
        }
        @keyframes fs-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}) as <T>(props: DataTableProps<T>) => JSX.Element;

// ─── ActionButton ─────────────────────────────────────────────────────────────

/**
 * Standard button component with variants and loading state.
 */
interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

export const ActionButton = memo(function ActionButton({ variant = 'primary', loading, fullWidth, children, ...props }: ActionButtonProps) {
  const baseStyle = variant === 'danger' ? css.dangerBtn : variant === 'ghost' ? css.ghostBtn : css.actionBtn;
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="fs-focus"
      aria-busy={loading}
      style={{
        ...baseStyle,
        opacity: (loading || props.disabled) ? 0.6 : 1,
        display: (fullWidth || props.style?.display) ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : props.style?.width,
        alignItems: 'center',
        justifyContent: 'center',
        gap: THEME.spacing.sm,
        ... (props.style || {}),
      }}
    >
      {loading && <span className="fs-spin-mini" aria-hidden="true" style={{ animation: 'fs-spin 0.8s linear infinite' }}>⟳</span>}
      {children}
    </button>
  );
});

// ─── Toggle ───────────────────────────────────────────────────────────────────

export const Toggle = memo(function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="fs-focus"
      tabIndex={0}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={{
        width: '32px',
        height: '18px',
        background: checked ? THEME.colors.success : THEME.colors.ghost,
        borderRadius: '9px',
        padding: '2px',
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div 
        aria-hidden="true"
        style={{
          width: '14px',
          height: '14px',
          background: '#fff',
          borderRadius: '50%',
          transform: checked ? 'translateX(14px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }} 
      />
    </div>
  );
});

// ─── FormField ────────────────────────────────────────────────────────────────

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

  // Enhance children with error indicator if it's a component that can handle it
  const childWithProps = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{
      'aria-invalid'?: string;
      'aria-describedby'?: string;
      hasError?: boolean;
    }>, {
      'aria-invalid': hasError ? 'true' : 'false',
      'aria-describedby': hasError ? effectiveErrorId : (helper ? `help-${generatedId}` : undefined),
      hasError,
    })
    : children;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.xs }}>
      <label
        style={{
          fontSize: THEME.fontSizes.sm,
          color: hasError ? THEME.colors.error : THEME.colors.ash,
          fontFamily: THEME.fonts.ui,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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

// ─── TextInput ────────────────────────────────────────────────────────────────

/**
 * Standard text input with optional prefix/suffix.
 */
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
  suffix?: string;
  hasError?: boolean;
}

export const TextInput = memo(function TextInput({ prefix, suffix, style: _style, hasError, ...props }: TextInputProps) {
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
        <input {...props} className="fs-focus" style={inputStyle} />
        {suffix && <span style={{ padding: `0 ${THEME.spacing.sm}`, color: THEME.colors.muted, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui, borderLeft: `1px solid ${THEME.colors.ghost}`, height: '100%', display: 'flex', alignItems: 'center' }}>{suffix}</span>}
      </div>
    );
  }
  return <input {...props} className="fs-focus" style={inputStyle} />;
});

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = memo(function Textarea({ hasError, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
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

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = memo(function Select({ hasError, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className="fs-focus"
      style={{
        ...css.input,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23444' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '28px',
        cursor: 'pointer',
        border: hasError ? `1px solid ${THEME.colors.error}` : undefined,
        background: hasError ? 'rgba(224,85,69,0.05)' : css.input.background,
      }}
    />
  );
});

// ─── Drawer ───────────────────────────────────────────────────────────────────

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
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousActiveRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
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
  }, [open]);

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

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

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
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousActiveRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
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

// ─── Toast ───────────────────────────────────────────────────────────────────

const Toast = memo(function Toast({ message, type, onClose }: { message: string | any; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const colors = {
    success: { bg: 'rgba(45,106,79,0.1)', border: 'rgba(45,106,79,0.3)', color: THEME.colors.success },
    error: { bg: 'rgba(224,85,69,0.1)', border: 'rgba(224,85,69,0.3)', color: THEME.colors.error },
    info: { bg: 'rgba(88,166,255,0.1)', border: 'rgba(88,166,255,0.3)', color: THEME.colors.info },
  };

  return (
    <div 
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 200,
        background: THEME.colors.bg,
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '280px',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      <span style={{ color: colors[type].color, fontSize: '14px' }}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span style={{ flex: 1, fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>
        {type === 'error' ? mapError(message) : message}
      </span>
      <button 
        onClick={onClose} 
        aria-label="Close notification"
        style={{ background: 'none', border: 'none', color: THEME.colors.ash, cursor: 'pointer', fontSize: '16px' }}
      >
        ×
      </button>
    </div>
  );
});

// ─── useToast hook ────────────────────────────────────────────────────────────

/**
 * Hook to manage and display toast notifications.
 */
export function useToast() {
  const [toast, setToast] = useState<{ message: string | any; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string | any, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const ToastComponent = useMemo(() => toast
    ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
    : null, [toast]);

  return useMemo(() => ({ showToast, ToastComponent }), [showToast, ToastComponent]);
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────────

export const ErrorBanner = memo(function ErrorBanner({ message, onRetry }: { message: string | any; onRetry?: () => void }) {
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

// ─── MonoText ─────────────────────────────────────────────────────────────────

export const MonoText = memo(function MonoText({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily: THEME.fonts.mono, fontSize: THEME.fontSizes.sm, color: color ?? THEME.colors.linen }}>
      {children}
    </span>
  );
});

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineEvent {
  status: string;
  timestamp: string;
  actor: string;
  note?: string | null;
}

export const Timeline = memo(function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((evt, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: i < events.length - 1 ? '16px' : 0 }}>
          {/* Line */}
          {i < events.length - 1 && (
            <div style={{ position: 'absolute', left: '7px', top: '14px', bottom: 0, width: '1px', background: THEME.colors.ghost }} />
          )}
          {/* Dot */}
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: i === 0 ? THEME.colors.linen : THEME.colors.ghost, border: `1px solid ${i === 0 ? THEME.colors.linen : THEME.colors.border2}`, flexShrink: 0, marginTop: '2px', zIndex: 1 }} />
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 500 }}>{evt.status}</span>
              <span style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>· {evt.actor}</span>
            </div>
            <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.muted, fontFamily: THEME.fonts.mono, marginTop: '2px' }}>{new Date(evt.timestamp).toLocaleString('en-IN')}</div>
            {evt.note && <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui, marginTop: '3px' }}>{evt.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── Spinner / Loader ─────────────────────────────────────────────────────────

export const Loader = memo(function Loader({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${THEME.colors.ghost}`,
        borderTop: `2px solid ${THEME.colors.linen}`,
        borderRadius: '50%',
        animation: 'fs-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes fs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  lines?: number;
  style?: React.CSSProperties;
}

export const Skeleton = memo(function Skeleton({ variant = 'text', width, height, lines = 1, style }: SkeletonProps) {
  const baseStyle = {
    background: `linear-gradient(90deg, ${THEME.colors.surface2} 25%, ${THEME.colors.ghost} 50%, ${THEME.colors.surface2} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'fs-skeleton-shimmer 1.5s infinite',
    borderRadius: variant === 'circular' ? '50%' : THEME.radius.md,
    width: variant !== 'circular' && width ? width : undefined,
    height: height ?? (variant === 'circular' ? '40px' : variant === 'rectangular' ? '80px' : '16px'),
    ...style,
  };

  if (variant === 'circular') {
    return <div style={{ ...baseStyle, width: baseStyle.height }} />;
  }

  if (lines > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: width ?? '100%' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...baseStyle,
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
        <style>{`
          @keyframes fs-skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div style={baseStyle} />
      <style>{`
        @keyframes fs-skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
});

// ─── MetricCardSkeleton ───────────────────────────────────────────────────────

export const MetricCardSkeleton = memo(function MetricCardSkeleton() {
  return (
    <div style={{
      background: THEME.colors.surface3,
      borderRadius: THEME.radius.lg,
      padding: '12px 14px',
      border: `1px solid ${THEME.colors.border}`,
    }}>
      <Skeleton width="40%" height="10px" />
      <Skeleton width="60%" height="22px" style={{ margin: '8px 0 6px' }} />
      <Skeleton width="50%" height="12px" />
    </div>
  );
});

// ─── MetricsGridSkeleton ──────────────────────────────────────────────────────

export const MetricsGridSkeleton = memo(function MetricsGridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
});

// ─── DataTableSkeleton ────────────────────────────────────────────────────────

export const DataTableSkeleton = memo(function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${THEME.colors.border}`, display: 'flex', gap: '20px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="15%" height="10px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '14px', borderBottom: i < rows - 1 ? `1px solid ${THEME.colors.ghost}` : 'none', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Skeleton width="15%" />
          <Skeleton width="25%" />
          <Skeleton width="15%" />
          <Skeleton width="20%" />
          <Skeleton width="15%" />
        </div>
      ))}
    </div>
  );
});

// ─── ProductCardSkeleton ──────────────────────────────────────────────────────

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div style={{ background: THEME.colors.surface3, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height="150px" />
      <div style={{ padding: '12px' }}>
        <Skeleton width="60%" height="12px" />
        <Skeleton width="90%" height="16px" style={{ margin: '8px 0' }} />
        <Skeleton width="40%" height="12px" />
      </div>
    </div>
  );
});

// ─── ProductsGridSkeleton ─────────────────────────────────────────────────────

export const ProductsGridSkeleton = memo(function ProductsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
});

export const DetailsSkeleton = memo(function DetailsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionCard title="Details">
          <Skeleton lines={4} />
        </SectionCard>
        <SectionCard title="Table">
          <DataTableSkeleton rows={3} />
        </SectionCard>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionCard title="Status">
          <Skeleton variant="rectangular" height="40px" />
          <Skeleton variant="text" lines={2} style={{ marginTop: '12px' }} />
        </SectionCard>
      </div>
    </div>
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function maskMobile(mobile: string): string {
  if (!mobile) return '-';
  const m = mobile.replace('+91', '').trim();
  if (m.length < 5) return m;
  return `${m.slice(0, 2)}xxx xx${m.slice(-3)}`;
}
