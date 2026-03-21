import type { Meta, StoryObj } from '@storybook/react';
import { DataTable, Badge } from '../../../components/admin/shared';

const meta: Meta<typeof DataTable> = {
  title: 'Admin/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

const columns = [
  { key: 'id', label: 'Order ID', width: '120px' },
  { key: 'customer', label: 'Customer', render: (row: any) => row.customer.name },
  { 
    key: 'status', 
    label: 'Status', 
    width: '150px',
    render: (row: any) => (
      <Badge type={row.status === 'CONFIRMED' ? 'confirmed' : 'pending'}>
        {row.status}
      </Badge>
    ) 
  },
  { key: 'total', label: 'Total', width: '100px', render: (row: any) => `₹${row.total.toLocaleString()}` },
];

const mockData = Array.from({ length: 20 }, (_, i) => ({
  id: `ORD-${1000 + i}`,
  customer: { name: `Customer ${i + 1}` },
  status: i % 3 === 0 ? 'CONFIRMED' : 'PENDING',
  total: 1500 + i * 100,
}));

export const SmallList: Story = {
  args: {
    columns,
    data: mockData,
  },
};

export const LargeListVirtual: Story = {
  args: {
    columns,
    data: Array.from({ length: 500 }, (_, i) => ({
      id: `ORD-${2000 + i}`,
      customer: { name: `Bulk Customer ${i + 1}` },
      status: i % 2 === 0 ? 'CONFIRMED' : 'PENDING',
      total: 2000 + (i % 50) * 100,
    })),
  },
};

export const Loading: Story = {
  args: {
    columns,
    data: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    empty: 'No orders found matching your filters.',
  },
};
