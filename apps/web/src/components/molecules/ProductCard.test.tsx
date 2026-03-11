import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductCard } from './ProductCard';

const mockProduct = {
  id: 'pro_123',
  slug: 'test-fabric',
  name: 'Test Fabric',
  brand: { name: 'Fabric Speaks' },
  price: 5000,
  sale_active: false,
  thumbnail_url: 'http://example.com/img.jpg',
};

const mockProductSale = {
  ...mockProduct,
  id: 'pro_456',
  sale_active: true,
  sale_price: 3500,
};

describe('ProductCard Edge Cases', () => {
  it('renders standard price without sale badge when not on sale', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Fabric')).toBeInTheDocument();
    expect(screen.getByText('Fabric Speaks')).toBeInTheDocument();
    
    // Check price
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.queryByText('Sale')).not.toBeInTheDocument();
  });

  it('renders sale price with correct struck-through original price and sale badge', () => {
    render(<ProductCard product={mockProductSale} />);
    
    // Sale badge should be present
    expect(screen.getByText('Sale')).toBeInTheDocument();
    
    // Display price should be 3500
    expect(screen.getByText('₹3,500')).toBeInTheDocument();
    
    // Original price should be struck through
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
  });

  it('toggles wishlist state internally when clicked', async () => {
    const handleToggle = vi.fn();
    render(<ProductCard product={mockProduct} onWishlistToggle={handleToggle} />);
    
    const wishlistButton = screen.getByRole('button', { name: /Add to wishlist/i });
    expect(wishlistButton).toBeInTheDocument();
    
    fireEvent.click(wishlistButton);
    
    await waitFor(() => {
      expect(handleToggle).toHaveBeenCalledWith('pro_123', true);
    });
  });
});
