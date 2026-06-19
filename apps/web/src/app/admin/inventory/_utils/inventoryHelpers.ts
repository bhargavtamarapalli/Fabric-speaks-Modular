export type AdjustmentReason =
  | 'damaged'
  | 'miscounted'
  | 'theft'
  | 'return_restocked'
  | 'supplier_short_shipped'
  | 'initial_stock'
  | 'correction'
  | 'other';

export const ADJUSTMENT_REASON_OPTIONS: Array<{ value: AdjustmentReason; label: string }> = [
  { value: 'correction', label: 'Stock count correction' },
  { value: 'damaged', label: 'Damaged goods removed' },
  { value: 'initial_stock', label: 'New shipment received' },
  { value: 'return_restocked', label: 'Return restocked' },
  { value: 'supplier_short_shipped', label: 'Supplier short shipped' },
  { value: 'miscounted', label: 'Miscounted' },
  { value: 'theft', label: 'Theft / shrinkage' },
  { value: 'other', label: 'Other' },
];

// Status filter options
export const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Healthy', value: 'HEALTHY' },
];
