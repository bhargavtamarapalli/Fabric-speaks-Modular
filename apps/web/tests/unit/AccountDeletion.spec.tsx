import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountDeletionPage from '../../src/app/account/delete/page';
import * as apiClient from '@/lib/apiClient';

// Mocks
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush })
}));

let mockUser: any = { mobile: '9999999999' };
let mockLogout = vi.fn();
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout })
}));

vi.mock('@/lib/apiClient', () => ({
  apiFetch: vi.fn()
}));

describe('AccountDeletionPage (DPDPA Flow)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DISCLAIMER step initially with correct DPDPA notices', () => {
    render(<AccountDeletionPage />);
    expect(screen.getByText(/Danger Zone/i)).toBeDefined();
    expect(screen.getByText(/Permanent Erasure/i)).toBeDefined();
    expect(screen.getByText(/irreversibly hashed/i)).toBeDefined();
    expect(screen.getByText(/Order History/i)).toBeDefined();
    expect(screen.getByText(/14-Day Window/i)).toBeDefined();
  });

  it('moves to OTP step upon Request OTP click', async () => {
    vi.mocked(apiClient.apiFetch).mockResolvedValueOnce({});
    render(<AccountDeletionPage />);
    
    const requestBtn = screen.getByText(/Proceed to Verification/i);
    fireEvent.click(requestBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Verification Code Sent to/i)).toBeDefined();
    });
  });

  it('handles INVALID OTP error correctly', async () => {
    // Stage 1: Move to OTP
    vi.mocked(apiClient.apiFetch)
      .mockResolvedValueOnce({}) // Send OTP Success
      .mockRejectedValueOnce(new Error('Invalid verfication code')); // Submit OTP failure
      
    render(<AccountDeletionPage />);
    
    fireEvent.click(screen.getByText(/Proceed to Verification/i));
    await waitFor(() => screen.getByPlaceholderText('000000'));
    
    // Stage 2: Enter Bad OTP
    const input = screen.getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByText(/Confirm Account Deletion/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid verfication code/i)).toBeDefined();
    });
  });

  it('shows SUCCESS state, calls logout, and redirects on valid OTP', async () => {
     vi.mocked(apiClient.apiFetch)
      .mockResolvedValueOnce({}) // Send
      .mockResolvedValueOnce({}); // Verify
      
    render(<AccountDeletionPage />);
    
    fireEvent.click(screen.getByText(/Proceed to Verification/i));
    await waitFor(() => screen.getByPlaceholderText('000000'));
    
    const input = screen.getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '999999' } });
    fireEvent.click(screen.getByText(/Confirm Account Deletion/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Account Deletion Initiated/i)).toBeDefined();
    });
    
    // Click Return to Home
    fireEvent.click(screen.getByText(/Return to Home/i));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });

});
