import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WishlistPage from '../../src/app/account/wishlist/page';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiFetch: vi.fn()
}));

describe('WishlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiClient.apiFetch).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<WishlistPage />);
    expect(screen.getByText('Loading...')).toBeDefined(); // From SpiderLoader mock
  });

  it('renders empty state correctly', async () => {
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({ items: [] });
    render(<WishlistPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Your wishlist is currently empty/i)).toBeDefined();
    });
  });

  it('renders items and handles removal', async () => {
    const mockItems = [
      { productId: 'p1', name: 'Silk Saree', slug: 'silk-saree', price: 5000, imageUrl: '' }
    ];
    vi.mocked(apiClient.apiFetch)
      .mockResolvedValueOnce({ items: mockItems }) // Initial load
      .mockResolvedValueOnce({}); // Delete success

    render(<WishlistPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Silk Saree')).toBeDefined();
    });

    const removeBtn = screen.getByLabelText('Remove from wishlist');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(apiClient.apiFetch).toHaveBeenCalledWith('/customer/wishlist/p1', { method: 'DELETE' });
    });
  });
});
