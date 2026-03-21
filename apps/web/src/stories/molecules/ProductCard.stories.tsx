import type { Meta, StoryObj } from '@storybook/react';
import { ProductCard } from '@/components/molecules/ProductCard';

const meta: Meta<typeof ProductCard> = {
  title: 'Molecules/ProductCard',
  component: ProductCard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ProductCard>;

const mockProduct = {
  id: '1',
  slug: 'test-product',
  name: 'Premium Cotton Shirt',
  brandName: 'FabricSpeaks',
  price: 2499,
  salePrice: 1999,
  isSaleActive: false,
  thumbnailUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&h=540&q=80',
};

export const Default: Story = {
  args: {
    product: mockProduct,
  },
};

export const OnSale: Story = {
  args: {
    product: {
      ...mockProduct,
      isSaleActive: true,
    },
  },
};

export const Wishlisted: Story = {
  args: {
    product: mockProduct,
    isInitialWishlisted: true,
  },
};
