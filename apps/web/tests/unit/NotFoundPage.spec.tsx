import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '../../app/not-found';

describe('NotFound Page (SCR-43)', () => {
  it('renders correctly with SpiderLoader and link to shop', () => {
    render(<NotFound />);
    
    expect(screen.getByText('404 - Thread Lost')).toBeDefined();
    expect(screen.getByText(/We couldn't find the page/i)).toBeDefined();
    
    const shopLink = screen.getByText('Return to Shop');
    expect(shopLink).toBeDefined();
    expect(shopLink.getAttribute('href')).toBe('/shop');
  });
});
