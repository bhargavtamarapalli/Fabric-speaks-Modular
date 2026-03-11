'use client';
import { useState, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Ripple {
  x: number;
  y: number;
  id: number;
}

interface TouchBloomProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

let rippleCount = 0;

export function TouchBloom({ children, className = '', onClick }: TouchBloomProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add ripple
    setRipples(prev => [...prev, { x, y, id: ++rippleCount }]);
    
    // Execute passed click handler
    if (onClick) onClick(e);
  };

  const handleAnimationComplete = (idToRemove: number) => {
    setRipples(prev => prev.filter(r => r.id !== idToRemove));
  };

  return (
    <div
      className={`relative overflow-hidden cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.15 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onAnimationComplete={() => handleAnimationComplete(ripple.id)}
            className="absolute rounded-full bg-[var(--fs-linen)] pointer-events-none"
            style={{
              left: ripple.x - 20, // 40x40 initial size centered
              top: ripple.y - 20,
              width: 40,
              height: 40,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
