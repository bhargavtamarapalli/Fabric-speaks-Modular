import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from '@/components/admin/shared/display/Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Admin/Display/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    onPageChange: { action: 'pageChanged' },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    totalItems: 200,
    itemsPerPage: 20,
  },
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    totalItems: 200,
    itemsPerPage: 20,
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
    totalItems: 200,
    itemsPerPage: 20,
  },
};

export const SinglePage: Story = {
  args: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 5,
    itemsPerPage: 20,
  },
};

export const ManyPages: Story = {
  args: {
    currentPage: 50,
    totalPages: 100,
    totalItems: 2000,
    itemsPerPage: 20,
  },
};
