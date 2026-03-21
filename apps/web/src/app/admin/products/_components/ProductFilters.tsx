'use client';

import React from 'react';
import { FilterChip, SearchInput } from '@/components/admin/shared';
import type { ProductsFilters } from '../_hooks/useProducts';

const FABRIC_FILTERS = ['All', 'Linen', 'Cotton', 'Khadi', 'Silk', 'Wool'];
const STATUS_FILTERS = ['All', 'Active', 'Draft'];

interface ProductFiltersProps {
  filters: ProductsFilters;
  onFilterChange: (patch: Partial<ProductsFilters>) => void;
}

export function ProductFilters({ filters, onFilterChange }: ProductFiltersProps) {
  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {FABRIC_FILTERS.map(f => (
          <FilterChip 
            key={f} 
            label={f} 
            active={filters.fabric === f} 
            onClick={() => onFilterChange({ fabric: f })} 
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '5px' }}>
        {STATUS_FILTERS.map(s => (
          <FilterChip 
            key={s} 
            label={s} 
            active={filters.status === s} 
            onClick={() => onFilterChange({ status: s })} 
          />
        ))}
      </div>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <SearchInput
          placeholder="Search products..."
          value={filters.search}
          onChange={(val) => onFilterChange({ search: val })}
        />
      </div>
    </div>
  );
}
