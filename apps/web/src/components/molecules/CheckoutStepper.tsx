'use client';
import { motion, AnimatePresence } from 'framer-motion';

export interface Step {
  label: string;
  number: number;
}

interface CheckoutStepperProps {
  steps: Step[];
  currentStep: number;
}

export function CheckoutStepper({ steps, currentStep }: CheckoutStepperProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, padding: '0 0 16px', borderBottom: '1px solid var(--fs-wire)' }}>
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <div key={step.number} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1, backgroundColor: isDone ? '#C9A96E' : isActive ? '#C9A96E' : '#252525', color: isDone || isActive ? '#0A0A0A' : '#6B6560' }}
                transition={{ duration: 0.25 }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontFamily: 'var(--font-dm-mono)',
                  border: `1px solid ${isDone || isActive ? '#C9A96E' : '#252525'}`,
                }}
              >
                {isDone ? '✓' : step.number}
              </motion.div>
              <span style={{ fontSize: 11, color: isActive ? '#F0EBE3' : '#6B6560', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: isDone ? '#C9A96E' : '#252525', margin: '0 8px', marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
