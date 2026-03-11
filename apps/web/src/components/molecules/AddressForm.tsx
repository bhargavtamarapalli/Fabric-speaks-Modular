'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkPincode, PincodeCheckResult } from '@/lib/api/pincode';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

export interface AddressFormData {
  full_name: string;
  mobile: string;
  pincode: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
}

interface AddressFormProps {
  value: AddressFormData;
  onChange: (v: AddressFormData) => void;
}

function FloatingInput({ label, name, value, onChange, type = 'text', readOnly = false }: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; type?: string; readOnly?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || !!value;
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <input
        id={name} name={name} type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=""
        readOnly={readOnly}
        style={{
          width: '100%', height: 52, padding: '18px 12px 6px',
          background: 'var(--fs-surface)', border: `1px solid ${active ? 'var(--fs-linen)' : 'var(--fs-wire)'}`,
          borderRadius: 2, color: 'var(--fs-ivory)', fontSize: 15, outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />
      <motion.label
        htmlFor={name}
        animate={{ top: active ? 6 : '50%', fontSize: active ? 11 : 14, color: active ? '#C9A96E' : '#6B6560', y: active ? 0 : '-50%' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ position: 'absolute', left: 12, pointerEvents: 'none', transformOrigin: 'left', letterSpacing: '0.04em' }}
      >
        {label}
      </motion.label>
    </div>
  );
}

export function AddressForm({ value, onChange }: AddressFormProps) {
  const [pincodeResult, setPincodeResult] = useState<PincodeCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  function set(field: keyof AddressFormData, val: string) {
    onChange({ ...value, [field]: val });
  }

  async function handlePincodeBlur() {
    if (value.pincode.length !== 6) return;
    setChecking(true);
    try {
      const res = await checkPincode(value.pincode);
      setPincodeResult(res);
    } catch { setPincodeResult(null); }
    finally { setChecking(false); }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <FloatingInput label="Full Name" name="full_name" value={value.full_name} onChange={v => set('full_name', v)} />
        <FloatingInput label="Mobile" name="mobile" value={value.mobile} onChange={v => set('mobile', v)} type="tel" />
      </div>
      <div style={{ position: 'relative' }}>
        <FloatingInput label="Pincode" name="pincode" value={value.pincode} onChange={v => set('pincode', v)} />
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
          {checking && <SpiderLoader size="sm" />}
        </div>
      </div>
      <AnimatePresence>
        {pincodeResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 2, background: pincodeResult.serviceable ? 'rgba(45,106,79,0.12)' : 'rgba(184,76,60,0.12)', border: `1px solid ${pincodeResult.serviceable ? 'var(--fs-success)' : 'var(--fs-error)'}`, fontSize: 13, color: pincodeResult.serviceable ? 'var(--fs-success)' : 'var(--fs-error)' }}
          >
            {pincodeResult.serviceable
              ? `✓ Delivers by ${pincodeResult.delivery_date_display} · ${pincodeResult.cod_available ? 'COD available' : 'Prepaid only'}`
              : '✗ Not deliverable to this pincode'}
          </motion.div>
        )}
      </AnimatePresence>
      <FloatingInput label="Address Line 1" name="line1" value={value.line1} onChange={v => set('line1', v)} />
      <FloatingInput label="Address Line 2 (optional)" name="line2" value={value.line2} onChange={v => set('line2', v)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <FloatingInput label="City" name="city" value={value.city} onChange={v => set('city', v)} />
        <FloatingInput label="State" name="state" value={value.state} onChange={v => set('state', v)} />
      </div>
    </div>
  );
}
