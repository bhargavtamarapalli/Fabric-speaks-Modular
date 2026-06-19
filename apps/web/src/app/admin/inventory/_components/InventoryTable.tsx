'use client';

import React, { memo, useMemo } from 'react';
import { THEME } from '@/lib/admin/theme';
import type { InventoryItem } from '@/lib/admin/types';
import { Badge, DataTable, MonoText } from '@/components/admin/shared';
import { truncateTextStyles } from '@/lib/ui/truncateText';

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  onAdjustClick: (item: InventoryItem) => void;
}

export const InventoryTable = memo(function InventoryTable({
  items,
  loading,
  onAdjustClick,
}: InventoryTableProps) {
  const columns = useMemo(() => [
    {
      key: 'product',
      label: 'Product',
      render: (i: InventoryItem) => (
        <div>
          <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui, ...truncateTextStyles(1) }} title={i.productName}>
            {i.productName}
          </div>
          <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, marginTop: '1px', ...truncateTextStyles(1) }} title={i.fabricType}>
            {i.fabricType}
          </div>
        </div>
      ),
    },
    {
      key: 'variant',
      label: 'Variant',
      width: '110px',
      render: (i: InventoryItem) => (
        <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base, fontFamily: THEME.fonts.ui }}>
          {i.colour} · {i.size}
        </span>
      ),
    },
    {
      key: 'sku',
      label: 'SKU',
      width: '110px',
      render: (i: InventoryItem) => <MonoText color={THEME.colors.muted}>{i.sku}</MonoText>,
    },
    {
      key: 'stock',
      label: 'Stock',
      width: '80px',
      render: (i: InventoryItem) => (
        <span
          style={{
            color: i.stockQty === 0 ? THEME.colors.error : i.stockQty < 5 ? THEME.colors.warning : THEME.colors.success,
            fontWeight: 600,
            fontFamily: THEME.fonts.ui,
          }}
        >
          {i.stockQty}
        </span>
      ),
    },
    {
      key: 'daily',
      label: 'Avg/day',
      width: '80px',
      render: (i: InventoryItem) => (
        <span style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>
          {i.avgDailySales.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'days',
      label: 'Days left',
      width: '90px',
      render: (i: InventoryItem) => {
        const d = i.daysRemaining;
        const color = d === null ? THEME.colors.muted : d <= 0 ? THEME.colors.error : d < 7 ? THEME.colors.warning : THEME.colors.ash;
        return (
          <span style={{ color, fontFamily: THEME.fonts.ui }}>
            {d === null ? '—' : d <= 0 ? 'Out' : `${d}d`}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (i: InventoryItem) => (
        <Badge type={i.status.toLowerCase() as any}>
          {i.status.charAt(0) + i.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'action',
      label: '',
      width: '80px',
      render: (i: InventoryItem) => (
        <button
          onClick={e => {
            e.stopPropagation();
            onAdjustClick(i);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: THEME.colors.linen,
            fontSize: THEME.fontSizes.sm,
            cursor: 'pointer',
            fontFamily: THEME.fonts.ui,
            padding: '2px 0',
          }}
        >
          Adjust →
        </button>
      ),
    },
  ], [onAdjustClick]);

  return (
    <div
      style={{
        background: THEME.colors.surface3,
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        overflow: 'hidden',
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: `${THEME.colors.muted} transparent`,
        }}
      >
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          rowKey={i => i.variantId}
        />
      </div>
    </div>
  );
});
