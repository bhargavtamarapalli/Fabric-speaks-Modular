'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  fabricType?: string;
  careInstructions?: string;
}

export function SizeGuideModal({ isOpen, onClose, fabricType, careInstructions }: SizeGuideModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Panel (Curtain wipe from right) */}
          <motion.div
            initial={{ clipPath: 'inset(0 0 0 100%)' }}
            animate={{ clipPath: 'inset(0 0 0 0%)' }}
            exit={{ clipPath: 'inset(0 0 0 100%)' }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="relative w-full max-w-md h-full bg-[var(--fs-surface)] border-l border-[var(--fs-wire)] shadow-2xl overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[var(--fs-surface)]/90 backdrop-blur border-b border-[var(--fs-wire)] p-6 flex items-center justify-between z-10">
              <h2 className="font-serif text-2xl text-[var(--fs-ivory)]">Size Guide</h2>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors"
              >
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-8">
              {/* Note about fabric */}
              {fabricType && (
                <div className="bg-[var(--fs-surface-2)] border border-[var(--fs-linen)]/20 p-4 rounded-[2px]">
                  <h3 className="font-sans text-[13px] uppercase tracking-wider text-[var(--fs-linen)] mb-2">
                    Fabric Note: {fabricType}
                  </h3>
                  <p className="font-sans text-[14px] text-[var(--fs-ash)] leading-relaxed">
                    This fabric has minimal stretch. If you are between sizes, we recommend sizing up for a relaxed fit or sticking to your true size for a tailored look.
                  </p>
                </div>
              )}

              {/* Measurement Instructions */}
              <div>
                <h3 className="font-serif text-[20px] text-[var(--fs-ivory)] mb-4">How to Measure</h3>
                <ul className="space-y-4 font-sans text-[14px] text-[var(--fs-ash)]">
                  <li><strong className="text-[var(--fs-ivory)] font-medium">Chest:</strong> Measure around the fullest part of your chest, keeping the tape level under your arms.</li>
                  <li><strong className="text-[var(--fs-ivory)] font-medium">Waist:</strong> Measure around your natural waistline, typically where your body bends side to side.</li>
                  <li><strong className="text-[var(--fs-ivory)] font-medium">Length:</strong> Measured from the highest point of the shoulder down to the hem.</li>
                </ul>
              </div>

              {/* Size Table */}
              <div>
                <h3 className="font-serif text-[20px] text-[var(--fs-ivory)] mb-4">Measurements (Inches)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-[14px]">
                    <thead>
                      <tr className="border-b border-[var(--fs-wire)] text-[var(--fs-ash)]">
                        <th className="py-3 font-medium">Size</th>
                        <th className="py-3 font-medium">Chest</th>
                        <th className="py-3 font-medium">Waist</th>
                        <th className="py-3 font-medium">Shoulder</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--fs-ivory)] font-mono text-[13px]">
                      <tr className="border-b border-[var(--fs-wire)] hover:bg-[var(--fs-surface-2)]">
                        <td className="py-3">XS</td><td className="py-3">36</td><td className="py-3">34</td><td className="py-3">16.5</td>
                      </tr>
                      <tr className="border-b border-[var(--fs-wire)] hover:bg-[var(--fs-surface-2)] border-l-2 border-l-transparent">
                        <td className="py-3">S</td><td className="py-3">38</td><td className="py-3">36</td><td className="py-3">17.5</td>
                      </tr>
                      <tr className="border-b border-[var(--fs-wire)] bg-[var(--fs-surface-2)] border-l-2 border-l-[var(--fs-linen)] relative">
                        {/* Highlight state example */}
                        <td className="py-3 pl-2">M</td><td className="py-3">40</td><td className="py-3">38</td><td className="py-3">18.5</td>
                      </tr>
                      <tr className="border-b border-[var(--fs-wire)] hover:bg-[var(--fs-surface-2)]">
                        <td className="py-3">L</td><td className="py-3">42</td><td className="py-3">40</td><td className="py-3">19.5</td>
                      </tr>
                      <tr className="hover:bg-[var(--fs-surface-2)]">
                        <td className="py-3">XL</td><td className="py-3">44</td><td className="py-3">42</td><td className="py-3">20.5</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Care Instructions */}
              {careInstructions && (
                <div className="pt-4 border-t border-[var(--fs-wire)]">
                  <h3 className="font-sans text-[13px] uppercase tracking-wider text-[var(--fs-ash)] mb-2">
                    Care Information
                  </h3>
                  <p className="font-sans text-[14px] text-[var(--fs-ash)] leading-relaxed">
                    {careInstructions}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
