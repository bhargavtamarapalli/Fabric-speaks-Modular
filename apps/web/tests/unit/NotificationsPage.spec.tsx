import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationsPage from '../../app/account/notifications/page';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiFetch: vi.fn()
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiClient.apiFetch).mockImplementation(() => new Promise(() => {}));
    render(<NotificationsPage />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders preferences and handles toggling', async () => {
    const mockPrefs = {
      orderUpdatesWhatsApp: true,
      orderUpdatesSms: true,
      orderUpdatesEmail: true,
      promotionsWhatsApp: false,
      promotionsSms: false,
      promotionsEmail: true
    };
    
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce(mockPrefs);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('WhatsApp Messages')).toBeDefined();
    });

    // Find the toggle button for WhatsApp Messages (which is initially true)
    // We'll just click the first button
    const buttons = screen.getAllByRole('button');
    const waButton = buttons[0]; // orderUpdatesWhatsApp

    // Mock successful patch
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({});

    fireEvent.click(waButton);

    await waitFor(() => {
      // It should call patch with orderUpdatesWhatsApp: false
      expect(apiClient.apiFetch).toHaveBeenCalledWith('/customer/preferences', {
         method: 'PATCH',
         body: JSON.stringify({ ...mockPrefs, orderUpdatesWhatsApp: false })
      });
    });
  });
});
