'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  FilterChip,
  SearchInput,
  useToast,
} from '@/components/admin/shared';
import { ConfirmModal } from '@/components/organisms/ConfirmModal';
import { useInventoryData } from './_hooks/useInventoryData';
import { useAdjustmentForm } from './_hooks/useAdjustmentForm';
import { InventoryTable } from './_components/InventoryTable';
import { InventoryAdjustDrawer } from './_components/InventoryAdjustDrawer';
import { STATUS_FILTERS } from './_utils/inventoryHelpers';

export default function InventoryPage() {
  const { showToast, ToastComponent } = useToast();
  const router = useRouter();
  const [filter, setFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [confirmAdjustment, setConfirmAdjustment] = React.useState(false);
  const { items, loading, error, refetch } = useInventoryData(filter, search);
  const {
    adjustItem,
    adjType,
    setAdjType,
    adjQty,
    setAdjQty,
    adjReason,
    setAdjReason,
    adjErrors,
    adjLoading,
    newTotal,
    handleAdjust,
    reset,
    openForm,
  } = useAdjustmentForm({ onSuccess: refetch });

  const handleAdjustClick = useCallback(
    (item: any) => {
      openForm(item);
    },
    [openForm]
  );

  const handleSubmitAdjustment = useCallback(async () => {
    if (!adjustItem) return;
    // Show confirmation first
    if (!confirmAdjustment) {
      setConfirmAdjustment(true);
      return;
    }

    // User confirmed, now perform the adjustment
    const result = await handleAdjust(adjustItem.variantId);
    if (result.success) {
      showToast('Stock updated', 'success');
      setConfirmAdjustment(false);
      reset();
      refetch();
    } else if (result.error) {
      showToast(result.error, 'error');
      setConfirmAdjustment(false);
    }
  }, [adjustItem, confirmAdjustment, handleAdjust, showToast, refetch, reset]);

  const handlePresetReason = useCallback(
    (reason: string) => {
      setAdjReason(reason);
    },
    [setAdjReason]
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} variants · ${items.filter(i => i.status !== 'HEALTHY').length} need attention`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <ActionButton variant="ghost" onClick={() => router.push('/admin/inventory/health')}>
              Stock health
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => router.push('/admin/inventory/expected')}>
              Expected stock
            </ActionButton>
          </div>
        }
      />

      {error && (
        <div style={{ marginBottom: '12px' }}>
          <ErrorBanner message={error} onRetry={refetch} />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_FILTERS.map(f => (
          <FilterChip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
        ))}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Search product or SKU..." value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Table */}
      <InventoryTable items={items} loading={loading} onAdjustClick={handleAdjustClick} />

      {/* Adjust Drawer */}
      <InventoryAdjustDrawer
        open={!!adjustItem}
        item={adjustItem}
        adjType={adjType}
        adjQty={adjQty}
        adjReason={adjReason}
        adjErrors={adjErrors}
        adjLoading={adjLoading}
        newTotal={newTotal}
        onClose={reset}
        onTypeChange={setAdjType}
        onQtyChange={setAdjQty}
        onReasonChange={setAdjReason}
        onPresetReason={handlePresetReason}
        onSubmit={handleSubmitAdjustment}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmAdjustment}
        title="Confirm Stock Adjustment"
        message={`Update stock from ${adjustItem?.stockQty || 0} to ${newTotal()} units?`}
        confirmText="Update Stock"
        cancelText="Cancel"
        loading={adjLoading}
        onConfirm={handleSubmitAdjustment}
        onCancel={() => setConfirmAdjustment(false)}
      />

      {ToastComponent}
    </div>
  );
}
