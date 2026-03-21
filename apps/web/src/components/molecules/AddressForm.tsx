'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkPincode, PincodeCheckResult } from '@/lib/api/pincode';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

export interface AddressFormData {
  fullName: string;
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

function FloatingInput({ label, name, value, onChange, type = 'text', readOnly = false, onBlur, ariaDescribedBy }: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; type?: string; readOnly?: boolean;
  onBlur?: () => void; ariaDescribedBy?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || !!value;
  return (
    <div className="relative mb-4">
      <input
        id={name} name={name} type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (onBlur) onBlur(); }}
        placeholder=""
        readOnly={readOnly}
        aria-required={name !== 'line2'}
        aria-describedby={ariaDescribedBy}
        className={`w-full h-[52px] pt-[18px] pb-[6px] px-3 bg-[var(--fs-surface)] border rounded-[2px] text-[var(--fs-ivory)] text-[15px] outline-none transition-all ${active ? 'border-[var(--fs-linen)]' : 'border-[var(--fs-wire)]'}`}
      />
      <motion.label
        htmlFor={name}
        animate={{ 
            top: active ? 6 : '50%', 
            fontSize: active ? 11 : 14, 
            color: active ? 'var(--fs-linen)' : 'var(--fs-ash)', 
            y: active ? 0 : '-50%' 
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute left-3 pointer-events-none origin-left tracking-[0.04em]"
      >
        {label}
      </motion.label>
    </div>
  );
}

export function AddressForm({ value, onChange }: AddressFormProps) {
  const [pincodeResult, setPincodeResult] = useState<PincodeCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  function updateField(field: keyof AddressFormData, val: string) {
    onChange({ ...value, [field]: val });
  }

  const abortControllerRef = useRef<AbortController | null>(null);

  async function handlePincodeBlur() {
    if (value.pincode.length !== 6) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setChecking(true);
    try {
      const res = await checkPincode(value.pincode, abortControllerRef.current.signal);
      setPincodeResult(res);
    } catch (err: any) { 
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;
      setPincodeResult(null); 
    }
    finally { setChecking(false); }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <FloatingInput label="Full Name" name="fullName" value={value.fullName} onChange={v => updateField('fullName', v)} />
        <FloatingInput label="Mobile" name="mobile" value={value.mobile} onChange={v => updateField('mobile', v)} type="tel" />
      </div>
      <div className="relative">
        <FloatingInput 
            label="Pincode" 
            name="pincode" 
            value={value.pincode} 
            onChange={v => updateField('pincode', v)} 
            onBlur={handlePincodeBlur}
            ariaDescribedBy="pincode-status"
        />
        <div className="absolute right-3 top-[26px] -translate-y-1/2">
          {checking && <SpiderLoader size="sm" />}
        </div>
      </div>
      <AnimatePresence>
        {pincodeResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            id="pincode-status"
            role="status"
            aria-live="polite"
            className={`mb-4 p-3 border rounded-[2px] text-[13px] transition-all flex items-center gap-2 ${
                pincodeResult.isServiceable 
                ? 'bg-[var(--fs-success)]/10 border-[var(--fs-success)] text-[var(--fs-success)]' 
                : 'bg-[var(--fs-error)]/10 border-[var(--fs-error)] text-[var(--fs-error)]'
            }`}
          >
            {pincodeResult.isServiceable
              ? `✓ Delivers in ${pincodeResult.estimatedDays} days · ${pincodeResult.codAvailable ? 'COD available' : 'Prepaid only'}`
              : '✗ Not deliverable to this pincode'}
          </motion.div>
        )}
      </AnimatePresence>
      <FloatingInput label="Address Line 1" name="line1" value={value.line1} onChange={v => updateField('line1', v)} />
      <FloatingInput label="Address Line 2 (optional)" name="line2" value={value.line2} onChange={v => updateField('line2', v)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <FloatingInput label="City" name="city" value={value.city} onChange={v => updateField('city', v)} />
        <FloatingInput label="State" name="state" value={value.state} onChange={v => updateField('state', v)} />
      </div>
    </div>
  );
}
