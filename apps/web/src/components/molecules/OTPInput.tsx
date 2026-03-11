'use client';
import { useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  error?: boolean;
}

export function OTPInput({ value, onChange, onComplete, error }: OTPInputProps) {
  const cells = 6;
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, char: string) {
    const digits = char.replace(/\D/g, '');
    if (!digits) return;
    const newVal = value.split('');
    newVal[index] = digits[0];
    const filled = newVal.join('').slice(0, cells);
    onChange(filled);
    if (filled.length === cells) { onComplete?.(filled); return; }
    refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace') {
      const newVal = value.split('');
      newVal[index] = '';
      onChange(newVal.join(''));
      if (index > 0) refs.current[index - 1]?.focus();
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: cells }, (_, i) => (
        <motion.input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            width: 48, height: 56,
            textAlign: 'center',
            fontSize: 22,
            fontFamily: 'var(--font-dm-mono)',
            color: 'var(--fs-ivory)',
            background: value[i] ? 'var(--fs-surface-2)' : 'transparent',
            border: `1px solid ${error ? 'var(--fs-error)' : value[i] ? 'var(--fs-linen)' : 'var(--fs-wire)'}`,
            borderRadius: 2,
            outline: 'none',
            caretColor: 'var(--fs-linen)',
          }}
        />
      ))}
    </div>
  );
}
