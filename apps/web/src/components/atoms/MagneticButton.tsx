'use client';
import { motion, useSpring } from 'framer-motion';
import { ReactNode } from 'react';

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function MagneticButton({
  children,
  onClick,
  className = '',
  type = 'button',
  disabled = false,
}: MagneticButtonProps) {
  const x = useSpring(0, { stiffness: 150, damping: 15 });
  const y = useSpring(0, { stiffness: 150, damping: 15 });

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    // Only apply magnetic effect on desktop (not disabled)
    if (disabled || window.matchMedia('(max-width: 768px)').matches) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  }

  return (
    <motion.button
      type={type}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={onClick}
      disabled={disabled}
      className={`relative px-8 py-4 uppercase tracking-[0.15em] text-[13px] font-medium transition-colors duration-300
                 bg-[var(--fs-linen)] text-[var(--fs-void)]
                 border border-[var(--fs-linen)]
                 hover:bg-[var(--fs-void)] hover:text-[var(--fs-linen)]
                 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {/* Touch bloom ripple container - to be implemented fully if needed, for now standard hover */}
      <span className="relative z-10 font-sans">{children}</span>
    </motion.button>
  );
}
