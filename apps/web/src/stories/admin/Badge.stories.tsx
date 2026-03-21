import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../../../components/admin/shared';

const meta: Meta<typeof Badge> = {
  title: 'Admin/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Pending: Story = {
  args: {
    type: 'pending',
    children: 'Pending Payment',
  },
};

export const Confirmed: Story = {
  args: {
    type: 'confirmed',
    children: 'Confirmed',
  },
};

export const Critical: Story = {
  args: {
    type: 'critical',
    children: 'Action Required',
  },
};

export const Healthy: Story = {
  args: {
    type: 'healthy',
    children: 'Everything OK',
  },
};
