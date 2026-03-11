import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SizeGuideModal } from './SizeGuideModal';

describe('SizeGuideModal Interactions', () => {
  it('does not render when isOpen is false', () => {
    render(<SizeGuideModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Size Guide')).not.toBeInTheDocument();
  });

  it('renders correctly when isOpen is true', () => {
    render(
      <SizeGuideModal 
        isOpen={true} 
        onClose={() => {}} 
        fabricType="Heavy Linen"
        careInstructions="Dry clean only"
      />
    );
    expect(screen.getByText('Size Guide')).toBeInTheDocument();
    expect(screen.getByText('Fabric Note: Heavy Linen')).toBeInTheDocument();
    expect(screen.getByText('Dry clean only')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<SizeGuideModal isOpen={true} onClose={handleClose} />);
    
    // The close button has an SVG icon (lucide-react X), so we can find it by querying the button containing it or just clicking the nearest button if there's only one header button
    // It's the only button in the header right now
    const buttons = screen.getAllByRole('button');
    // Assuming the first button is the Close button
    fireEvent.click(buttons[0]);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
