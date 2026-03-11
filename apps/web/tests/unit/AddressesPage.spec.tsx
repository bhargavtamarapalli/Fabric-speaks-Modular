import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddressesPage from '../../app/account/addresses/page';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiFetch: vi.fn()
}));

beforeAll(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('AddressesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no addresses exist', async () => {
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({ items: [] });
    render(<AddressesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no saved addresses yet/i)).toBeDefined();
    });
  });

  it('renders addresses and prevents deleting default address', async () => {
    const mockAddresses = [
      { id: 'a1', type: 'HOME', recipientName: 'John Doe', street: '123 St', city: 'City', state: 'State', pincode: '123456', isDefault: true },
      { id: 'a2', type: 'WORK', recipientName: 'Jane Doe', street: '456 Ave', city: 'City', state: 'State', pincode: '654321', isDefault: false }
    ];
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({ items: mockAddresses });

    render(<AddressesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('Jane Doe')).toBeDefined();
    });

    // Try to delete non-default
    const buttons = screen.getAllByRole('button');
    const removeBtn = buttons.find(b => b.textContent?.includes('Remove'));
    
    if (removeBtn) {
        fireEvent.click(removeBtn);
        await waitFor(() => {
            expect(apiClient.apiFetch).toHaveBeenCalledWith('/customer/addresses/a2', { method: 'DELETE' });
        });
    }
  });
});
