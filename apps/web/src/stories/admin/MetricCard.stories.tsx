import type { Meta, StoryObj } from '@storybook/react';
import { MetricCard } from '../../../components/admin/shared';

const meta: Meta<typeof MetricCard> = {
  title: 'Admin/MetricCard',
  component: MetricCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Revenue: Story = {
  args: {
    label: 'Revenue today',
    value: '₹1,24,500',
    delta: 12,
    deltaLabel: 'vs yesterday',
    accent: 'linen',
  },
};

export const Orders: Story = {
  args: {
    label: 'Orders today',
    value: 48,
    delta: -5,
    deltaLabel: 'vs yesterday',
  },
};

export const LowStock: Story = {
  args: {
    label: 'Low stock items',
    value: 12,
    accent: 'warning',
    onClick: () => alert('Navigate to Inventory'),
  },
};

export const CriticalReturns: Story = {
  args: {
    label: 'Open returns',
    value: 3,
    accent: 'error',
    onClick: () => alert('Navigate to Returns'),
  },
};
