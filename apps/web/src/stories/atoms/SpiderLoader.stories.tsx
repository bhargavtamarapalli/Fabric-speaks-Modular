import type { Meta, StoryObj } from '@storybook/react';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

const meta: Meta<typeof SpiderLoader> = {
  title: 'Atoms/SpiderLoader',
  component: SpiderLoader,
  argTypes: {
    color: { control: 'color' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
};

export default meta;
type Story = StoryObj<typeof SpiderLoader>;

export const Default: Story = {
  args: {
    size: 'md',
    color: '#C9A96E',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};
