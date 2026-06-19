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
  Drawer,
  FormField,
  useToast,
} from '@/components/admin/shared';
import { ConfirmModal } from '@/components/organisms/ConfirmModal';
import { useInventoryData } from './_hooks/useInventoryData';
import { useAdjustmentForm } from './_hooks/useAdjustmentForm';
import { InventoryTable } from './_components/InventoryTable';
import { InventoryAdjustDrawer } from './_components/InventoryAdjustDrawer';
import { STATUS_FILTERS, type AdjustmentReason } from './_utils/inventoryHelpers';
import { inventoryApi } from '@/lib/admin/api';

export default function InventoryPage() {
  const { showToast, ToastComponent } = useToast();
  const router = useRouter();
  const [filter, setFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [confirmAdjustment, setConfirmAdjustment] = React.useState(false);
  const [bulkDrawerOpen, setBulkDrawerOpen] = React.useState(false);
  const [bulkFile, setBulkFile] = React.useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<{ success: number; failed: number; errors: Array<{ row: Record<string, unknown>; error: string }> } | null>(null);

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
    if (!confirmAdjustment) {
      setConfirmAdjustment(true);
      return;
    }

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
    (reason: AdjustmentReason) => {
      setAdjReason(reason);
    },
    [setAdjReason]
  );

  const handleBulkUpload = useCallback(async () => {
    if (!bulkFile) {
      showToast('CSV file is required', 'error');
      return;
    }

    try {
      setBulkUploading(true);
      const result = await inventoryApi.bulkAdjust(bulkFile);
      setBulkResult(result);
      if (result.failed > 0) {
        showToast(`Uploaded with ${result.failed} failed row(s).`, 'error');
      } else {
        showToast(`Bulk upload successful. ${result.success} rows updated.`, 'success');
      }
      refetch();
    } catch (e: any) {
      showToast(e?.message ?? 'Bulk upload failed', 'error');
    } finally {
      setBulkUploading(false);
    }
  }, [bulkFile, showToast, refetch]);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} variants - ${items.filter(i => i.status !== 'HEALTHY').length} need attention`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <ActionButton variant="ghost" onClick={() => { setBulkDrawerOpen(true); setBulkResult(null); }}>
              Bulk stock upload
            </ActionButton>
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

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_FILTERS.map(f => (
          <FilterChip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
        ))}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Search product or SKU..." value={search} onChange={setSearch} />
        </div>
      </div>

      <InventoryTable items={items} loading={loading} onAdjustClick={handleAdjustClick} />

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

      <Drawer open={bulkDrawerOpen} onClose={() => { setBulkDrawerOpen(false); setBulkFile(null); setBulkResult(null); }} title="Bulk stock upload (CSV)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="CSV file" required>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
              style={{
                width: '100%',
                border: `1px solid ${THEME.colors.border}`,
                borderRadius: THEME.radius.md,
                background: THEME.colors.surface2,
                color: THEME.colors.ivory,
                padding: '8px 10px',
                fontFamily: THEME.fonts.ui,
                fontSize: THEME.fontSizes.sm,
              }}
            />
          </FormField>

          <div style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs, lineHeight: 1.5 }}>
            Required columns: <code>variant_id,new_qty,reason</code>. Valid reasons: <code>damaged</code>, <code>miscounted</code>, <code>theft</code>, <code>return_restocked</code>, <code>supplier_short_shipped</code>, <code>initial_stock</code>, <code>correction</code>, <code>other</code>.
          </div>

          <ActionButton onClick={handleBulkUpload} loading={bulkUploading} fullWidth>
            Upload CSV
          </ActionButton>

          {bulkResult && (
            <div style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.md, padding: '10px 12px', background: THEME.colors.surface2 }}>
              <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm }}>
                Success: {bulkResult.success} | Failed: {bulkResult.failed}
              </div>
              {bulkResult.errors.length > 0 && (
                <div style={{ marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {bulkResult.errors.slice(0, 10).map((err, idx) => (
                    <div key={`${idx}-${err.error}`} style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.error, fontFamily: THEME.fonts.ui, marginBottom: '4px' }}>
                      Row {idx + 1}: {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {ToastComponent}
    </div>
  );
}
