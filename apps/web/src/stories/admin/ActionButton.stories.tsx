import type { Meta, StoryObj } from '@storybook/react';
import { ActionButton } from '../../../components/admin/shared';

const meta: Meta<typeof ActionButton> = {
  title: 'Admin/ActionButton',
  component: ActionButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ActionButton>;

export const Primary: Story = {
  args: {
    children: 'Save Changes',
    variant: 'primary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Edit',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Remove',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    children: 'Saving...',
    disabled: true,
  },
};
