'use client';

import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  Pagination,
  THEME,
} from '@/components/admin/shared';

import dynamic from 'next/dynamic';
import { ordersApi as ordersApiClient } from '@/lib/admin/api';
import { useOrders } from './_hooks/useOrders';
import { OrderFilters } from './_components/OrderFilters';
import { BulkActions } from './_components/BulkActions';
import { DataTableSkeleton } from '@/components/admin/shared';

const OrdersDataGrid = dynamic(
  () => import('./_components/OrdersDataGrid').then(mod => mod.OrdersDataGrid),
  { loading: () => <DataTableSkeleton rows={10} /> }
);

export default function OrdersPage() {
  const {
    orders,
    total,
    page,
    limit,
    totalPages,
    currentPage,
    itemsPerPage,
    loading,
    error,
    filters,
    updateFilters,
    goToPage,
    selected,
    toggleSelect,
    clearSelection,
    bulkLoading,
    handleBulkShiprocket,
    load,
  } = useOrders();

  const exportUrl = ordersApiClient.exportCsv();

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${total} orders`}
        action={
          <ActionButton 
            onClick={() => window.open(exportUrl, '_blank')} 
            variant="ghost"
          >
            Export CSV
          </ActionButton>
        }
      />

      {error && (
        <div style={{ marginBottom: THEME.spacing.md }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <OrderFilters 
        filters={filters} 
        onFilterChange={updateFilters} 
      />

      <BulkActions
        selectedCount={selected.length}
        onBulkShiprocket={handleBulkShiprocket}
        onClearSelection={clearSelection}
        loading={bulkLoading}
      />

      <OrdersDataGrid
        orders={orders}
        loading={loading}
        selected={selected}
        onToggleSelect={toggleSelect}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={itemsPerPage}
        onPageChange={goToPage}
      />
    </div>
  );
}
