'use client';

import React, { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { SectionCard, MonoText } from '@/components/admin/shared';
import type { DashboardData } from '@/lib/admin/types';

interface StockHealthCardProps {
  data: DashboardData;
}

/**
 * A card displaying inventory health metrics and critical items.
 * Visualizes stock status with a segmented bar and lists items requiring immediate action.
 * Memoized to prevent re-renders when parent updates with same data.
 */
export const StockHealthCard = memo(function StockHealthCard({ data }: StockHealthCardProps) {
  const router = useRouter();
  // Memoize critical items computation to avoid recalculation on each render
  const criticalItems = useMemo(
    () => data.stockHealth.items.filter(i => i.status === 'CRITICAL').slice(0, 3),
    [data.stockHealth.items]
  );

  // Memoize legend data to avoid recreation on each render
  const legendData = useMemo(
    () => [
      { color: THEME.colors.error, label: 'Critical (0 stock)', count: data.stockHealth.critical },
      { color: THEME.colors.warning, label: 'Warning (<5 units)', count: data.stockHealth.warning },
      { color: THEME.colors.success, label: 'Healthy', count: data.stockHealth.healthy },
    ],
    [data.stockHealth.critical, data.stockHealth.warning, data.stockHealth.healthy]
  );

  return (
    <SectionCard
      title="Stock health"
      action={
        <button
          onClick={() => router.push('/admin/inventory/health')}
          style={{
            fontSize: THEME.fontSizes.sm,
            color: THEME.colors.ash,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit'
          }}
          aria-label="Manage stock health"
        >
          Manage →
        </button>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: THEME.fontSizes.sm, color: THEME.colors.muted, marginBottom: THEME.spacing.sm, fontFamily: THEME.fonts.ui }}>
        <span>{data.stockHealth.total} total variants</span>
        {data.stockHealth.critical > 0 && (
          <span style={{ color: THEME.colors.error }}>{data.stockHealth.critical} out of stock</span>
        )}
      </div>

      {/* Segmented bar */}
      <div style={{ display: 'flex', height: '5px', borderRadius: THEME.radius.sm, overflow: 'hidden', marginBottom: THEME.spacing.md }}>
        {data.stockHealth.critical > 0 && (
          <div style={{ background: THEME.colors.error, width: `${(data.stockHealth.critical / data.stockHealth.total) * 100}%` }} />
        )}
        {data.stockHealth.warning > 0 && (
          <div style={{ background: THEME.colors.warning, width: `${(data.stockHealth.warning / data.stockHealth.total) * 100}%` }} />
        )}
        <div style={{ background: THEME.colors.success, flex: 1 }} />
      </div>

      {/* Legend */}
      {legendData.map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: THEME.spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.sm }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
            <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{row.label}</span>
          </div>
          <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{row.count}</span>
        </div>
      ))}

      {/* Critical items */}
      {criticalItems.length > 0 && (
        <div style={{ marginTop: THEME.spacing.md, borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: THEME.spacing.md }}>
          <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: THEME.spacing.sm, fontFamily: THEME.fonts.ui }}>Critical items</div>
          {criticalItems.map(item => (
            <div key={item.variantId} style={{ display: 'flex', justifyContent: 'space-between', padding: `${THEME.spacing.xs} 0` }}>
              <div>
                <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{item.productName} · {item.size} {item.colour}</div>
                <MonoText>{item.sku}</MonoText>
              </div>
              <span style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.error, fontWeight: 600, fontFamily: THEME.fonts.ui }}>{item.stockQty} units</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
});
