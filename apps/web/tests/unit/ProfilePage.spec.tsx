import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from '../../app/account/profile/page';
import * as apiClient from '@/lib/apiClient';

let mockUser: any = { name: 'Test User', email: 'test@example.com', mobile: '9999999999' };
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('@/lib/apiClient', () => ({
  apiFetch: vi.fn()
}));

beforeAll(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading initially', () => {
    vi.mocked(apiClient.apiFetch).mockImplementation(() => new Promise(() => {}));
    render(<ProfilePage />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders profile data and allows editing', async () => {
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({
      name: 'John Doe',
      email: 'john@example.com',
      mobile: '9876543210'
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeDefined();
    });

    // Inputs should be disabled initially
    const nameInput = screen.getByDisplayValue('John Doe');
    expect((nameInput as HTMLInputElement).disabled).toBe(true);

    // Click Edit
    fireEvent.click(screen.getByText('Edit'));
    expect((nameInput as HTMLInputElement).disabled).toBe(false);

    // Edit name
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    // Save changes
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({});
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(apiClient.apiFetch).toHaveBeenCalledWith('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Jane Doe', email: 'john@example.com' })
      });
      // Should exit edit mode
      expect((nameInput as HTMLInputElement).disabled).toBe(true);
    });
  });

  it('keeps mobile number read-only even in edit mode', async () => {
     vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({
      name: 'John Doe',
      email: 'john@example.com',
      mobile: '9876543210'
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('9876543210')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Edit'));
    
    const mobileInput = screen.getByDisplayValue('9876543210');
    expect((mobileInput as HTMLInputElement).disabled).toBe(true);
  });
});
