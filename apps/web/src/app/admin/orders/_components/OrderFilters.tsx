'use client';

import React from 'react';
import { FilterChip, SearchInput } from '@/components/admin/shared';
import type { OrdersFilters } from '../_hooks/useOrders';

const STATUS_FILTERS = [
  { label: 'All',         value: '' },
  { label: 'Pending',     value: 'PENDING_PAYMENT' },
  { label: 'Confirmed',   value: 'CONFIRMED' },
  { label: 'Processing',  value: 'PROCESSING' },
  { label: 'Shipped',     value: 'SHIPPED' },
  { label: 'Delivered',   value: 'DELIVERED' },
  { label: 'Cancelled',   value: 'CANCELLED' },
];

interface OrderFiltersProps {
  filters: OrdersFilters;
  onFilterChange: (patch: Partial<OrdersFilters>) => void;
}

export function OrderFilters({ filters, onFilterChange }: OrderFiltersProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={filters.status === f.value}
            onClick={() => onFilterChange({ status: f.value })}
          />
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <SearchInput
          placeholder="Search by order ID, customer name, or mobile..."
          value={filters.search}
          onChange={(val) => onFilterChange({ search: val })}
        />
      </div>
    </div>
  );
}
