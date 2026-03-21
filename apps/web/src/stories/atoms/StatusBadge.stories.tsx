import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from '@/components/atoms/StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Atoms/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: {
      control: 'select',
      options: [
        'PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 
        'CANCELLED', 'REQUESTED', 'APPROVED', 'RESOLVED_REFUNDED', 'RESOLVED_REPLACED'
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Placed: Story = {
  args: {
    status: 'PLACED',
  },
};

export const Shipped: Story = {
  args: {
    status: 'SHIPPED',
  },
};

export const Delivered: Story = {
  args: {
    status: 'DELIVERED',
  },
};

export const Cancelled: Story = {
  args: {
    status: 'CANCELLED',
  },
};
