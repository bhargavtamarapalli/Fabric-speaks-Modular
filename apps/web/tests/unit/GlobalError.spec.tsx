import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '../../app/global-error';

describe('GlobalError Page (SCR-43)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders correctly, logs error, and triggers reset', () => {
    const mockError = new Error('Test Crash');
    const mockReset = vi.fn();

    render(<GlobalError error={mockError as any} reset={mockReset} />);
    
    expect(screen.getByText('System Error')).toBeDefined();
    expect(console.error).toHaveBeenCalledWith(mockError);

    const tryAgainBtn = screen.getByText('Try Again');
    fireEvent.click(tryAgainBtn);
    expect(mockReset).toHaveBeenCalled();
    
    expect(screen.getByText('Go to Homepage').getAttribute('href')).toBe('/');
  });
});
