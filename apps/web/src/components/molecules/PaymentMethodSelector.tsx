'use client';
import { motion } from 'framer-motion';

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'COD';

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  onChange: (v: PaymentMethod) => void;
  codSurcharge?: number;
}

const METHODS: { id: PaymentMethod; label: string; icon: string; description: string }[] = [
  { id: 'UPI',        label: 'UPI',          icon: '⚡', description: 'Pay via GPay, PhonePe, BHIM' },
  { id: 'CARD',       label: 'Card',         icon: '💳', description: 'Credit or debit card' },
  { id: 'NETBANKING', label: 'Net Banking',  icon: '🏦', description: 'All major banks' },
  { id: 'COD',        label: 'Cash on Delivery', icon: '🏠', description: '' },
];

export function PaymentMethodSelector({ value, onChange, codSurcharge = 40 }: PaymentMethodSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {METHODS.map(m => {
        const selected = value === m.id;
        return (
          <motion.button
            key={m.id}
            onClick={() => onChange(m.id)}
            whileTap={{ scale: 0.98 }}
            animate={{
              borderColor: selected ? '#C9A96E' : '#252525',
              background: selected ? 'var(--fs-surface-2)' : 'var(--fs-surface)',
            }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px', borderRadius: 2, cursor: 'pointer',
              border: `1px solid ${selected ? '#C9A96E' : '#252525'}`,
              background: selected ? 'var(--fs-surface-2)' : 'var(--fs-surface)',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 24 }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: 'var(--fs-ivory)', fontFamily: 'var(--font-dm-sans)', fontWeight: 500 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fs-ash)' }}>
                {m.id === 'COD' ? `+₹${codSurcharge} handling fee` : m.description}
              </div>
            </div>
            {selected && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--fs-linen)', flexShrink: 0 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
