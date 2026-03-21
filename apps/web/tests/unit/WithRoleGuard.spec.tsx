import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WithRoleGuard } from '../../components/admin/WithRoleGuard';

// Mocks
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush })
}));

let mockUser: any = null;
let mockLoading = false;
vi.mock('../../lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, loading: mockLoading })
}));

// Dummy Component inside guard
const ProtectedContent = () => <div data-testid="protected-content">Secret Admin Area</div>;

describe('WithRoleGuard', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loader when still loading', () => {
    mockLoading = true;
    mockUser = null;
    const { container } = render(
      <WithRoleGuard allowedRoles={['SUPER_ADMIN']}>
        <ProtectedContent />
      </WithRoleGuard>
    );
    expect(screen.queryByTestId('protected-content')).toBeNull();
    // Assuming loader renders an svg
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('redirects to login if user is unauthenticated', () => {
    mockLoading = false;
    mockUser = null;
    render(
      <WithRoleGuard allowedRoles={['SUPER_ADMIN']}>
        <ProtectedContent />
      </WithRoleGuard>
    );
    expect(mockRouterPush).toHaveBeenCalledWith('/login?redirect=/admin');
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('redirects to unauthorized if user role is insufficient', () => {
    mockLoading = false;
    mockUser = { role: 'CUSTOMER' }; // Only customer
    render(
      <WithRoleGuard allowedRoles={['SUPER_ADMIN', 'INVENTORY_MANAGER']}>
        <ProtectedContent />
      </WithRoleGuard>
    );
    expect(mockRouterPush).toHaveBeenCalledWith('/admin/unauthorized');
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('renders content perfectly if user role intersects allowedRoles', () => {
    mockLoading = false;
    mockUser = { role: 'INVENTORY_MANAGER' };
    render(
      <WithRoleGuard allowedRoles={['SUPER_ADMIN', 'INVENTORY_MANAGER']}>
        <ProtectedContent />
      </WithRoleGuard>
    );
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(screen.getByTestId('protected-content')).toBeDefined();
  });

});
