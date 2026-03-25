'use client';

import React, { memo } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { THEME, css } from '@/lib/admin/theme';
import { DataTableSkeleton } from '../skeletons/TableSkeletons';

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
  renderEmpty?: () => React.ReactNode;
}

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

export const DataTable = memo(function DataTable<T>({ 
  columns, 
  data, 
  loading, 
  onRowClick, 
  rowKey = 'id' as keyof T, 
  empty = "No items found." 
}: DataTableProps<T>) {
  if (loading) return <DataTableSkeleton />;
  if (!data?.length) {
    if (renderEmpty) return <div style={{ padding: THEME.spacing.xxl }}>{renderEmpty()}</div>;
    return <div style={{ padding: THEME.spacing.xxl, textAlign: 'center', color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{empty}</div>;
  }

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
