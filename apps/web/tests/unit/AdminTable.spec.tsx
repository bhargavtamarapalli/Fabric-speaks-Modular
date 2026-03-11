import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminTable } from '../../components/admin/AdminTable';

// Mock URL.createObjectURL for CSV export
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('AdminTable UI Logic', () => {

  const dummyData = [
    { id: 1, name: 'Alpha', price: 100 },
    { id: 2, name: 'Beta', price: 50 },
    { id: 3, name: 'Gamma', price: 200 }
  ];

  const columns = [
    { header: 'ID', accessor: 'id' as const, sortable: true },
    { header: 'Name', accessor: 'name' as const, sortable: true },
    { header: 'Price', accessor: 'price' as const, sortable: true }
  ];

  it('renders correctly with given columns and data', () => {
    render(<AdminTable data={dummyData} columns={columns} globalSearchField="name" />);
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.getByText('Gamma')).toBeDefined();
  });

  it('shows an empty state on 0 records', () => {
    render(<AdminTable data={[]} columns={columns} />);
    expect(screen.getByText('No records found.')).toBeDefined();
  });

  it('filters data accurately with globalSearchField', () => {
    const { container } = render(<AdminTable data={dummyData} columns={columns} globalSearchField="name" searchPlaceholder="Search..." />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'alp' } });
    
    // Alpha should be visible
    expect(screen.getByText('Alpha')).toBeDefined();
    // Beta should be filtered out
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('handles custom accessor rendering gracefully', () => {
    const customCols = [
      { header: 'Custom Name', accessor: (row: any) => <span data-testid="custom-val">Custom {row.name}</span> }
    ];
    render(<AdminTable data={[{ name: 'Test' }]} columns={customCols} />);
    
    const customEl = screen.getByTestId('custom-val');
    expect(customEl.textContent).toBe('Custom Test');
  });

});
