import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmationModalProvider, useConfirmationModal } from '../../components/admin/ConfirmationModal';
import React from 'react';

const TestComponent = () => {
  const { requestConfirmation } = useConfirmationModal();
  const [result, setResult] = React.useState<string>('idle');

  const handleTrigger = async () => {
    const res = await requestConfirmation({
      title: 'Danger Zone',
      message: 'Are you absolutely sure?',
      confirmLabel: 'Yes, Delete',
      isDestructive: true
    });
    setResult(res ? 'confirmed' : 'cancelled');
  };

  return (
    <div>
      <div data-testid="result">{result}</div>
      <button onClick={handleTrigger}>Trigger Modal</button>
    </div>
  );
};

describe('ConfirmationModal & Provider', () => {

  it('renders nothing initially', () => {
    render(
      <ConfirmationModalProvider>
        <TestComponent />
      </ConfirmationModalProvider>
    );
    expect(screen.queryByText('Danger Zone')).toBeNull();
  });

  it('opens modal and resolves false on Cancel', async () => {
    render(
      <ConfirmationModalProvider>
        <TestComponent />
      </ConfirmationModalProvider>
    );

    fireEvent.click(screen.getByText('Trigger Modal'));
    
    expect(screen.getByText('Danger Zone')).toBeDefined();
    
    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'));
    
    await waitFor(() => {
      expect(screen.getByTestId('result').textContent).toBe('cancelled');
    });
  });

  it('opens modal and resolves true on Confirm', async () => {
    render(
      <ConfirmationModalProvider>
        <TestComponent />
      </ConfirmationModalProvider>
    );

    fireEvent.click(screen.getByText('Trigger Modal'));
    
    // Click Confirm
    fireEvent.click(screen.getByText('Yes, Delete'));
    
    await waitFor(() => {
      expect(screen.getByTestId('result').textContent).toBe('confirmed');
    });
  });

});
