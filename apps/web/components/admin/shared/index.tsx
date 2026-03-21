'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Shared Admin Components (Modular Barrel)
// All components use THEME values only.
// ─────────────────────────────────────────────────────────────────────────────

// Re-exports from theme and errors
export { THEME, css, type BadgeType } from '@/lib/admin/theme';
export { mapError } from '@/lib/admin/errors';

// Display components
export * from './display/Badge';
export * from './display/MetricCard';
export * from './display/PageHeader';
export * from './display/SectionCard';
export * from './display/PendingWidget';
export * from './display/FilterChip';
export * from './display/MonoText';
export * from './display/Timeline';
export * from './display/Pagination';

// Form components
export * from './forms/ActionButton';
export * from './forms/Toggle';
export * from './forms/FormField';
export * from './forms/TextInput';
export * from './forms/Textarea';
export * from './forms/Select';
export * from './forms/SearchInput';

// Data components
export * from './data/DataTable';

// Feedback & Overlay components
export * from './feedback/Drawer';
export * from './feedback/ConfirmModal';
export * from './feedback/Toast';
export * from './feedback/ErrorBanner';
export * from './feedback/Loader';

// Hooks
export * from './hooks/useToast';

// Skeletons
export * from './skeletons/Skeleton';
export * from './skeletons/MetricSkeletons';
export * from './skeletons/TableSkeletons';
export * from './skeletons/ProductSkeletons';
export * from './skeletons/DetailsSkeleton';

// Utilities
export * from './utils';
