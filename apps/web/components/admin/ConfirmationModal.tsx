'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal = ({
  isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  isDestructive, onConfirm, onCancel
}: ConfirmationModalProps) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--fs-void)] border border-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-[var(--fs-linen)]"
        >
          <h3 className="text-xl font-medium mb-2">{title}</h3>
          <div className="text-gray-400 mb-6 text-sm">
            {message}
          </div>
          <div className="flex justify-end gap-3 font-medium text-sm">
            <button 
              onClick={onCancel}
              className="px-4 py-2 rounded border border-gray-700 hover:bg-gray-800 transition"
            >
              {cancelLabel}
            </button>
            <button 
              onClick={onConfirm}
              className={`px-4 py-2 rounded transition ${
                isDestructive 
                  ? 'bg-red-900/40 text-red-500 hover:bg-red-900/60 border border-red-900/50' 
                  : 'bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-300'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface ModalContextType {
  requestConfirmation: (options: Omit<ConfirmationModalProps, 'isOpen' | 'onConfirm' | 'onCancel'>) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ConfirmationModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options?: Omit<ConfirmationModalProps, 'isOpen' | 'onConfirm' | 'onCancel'>;
    resolver?: (value: boolean) => void;
  }>({ isOpen: false });

  const requestConfirmation = (options: Omit<ConfirmationModalProps, 'isOpen' | 'onConfirm' | 'onCancel'>) => {
    return new Promise<boolean>((resolve) => {
      setModalState({ isOpen: true, options, resolver: resolve });
    });
  };

  const handleConfirm = () => {
    modalState.resolver?.(true);
    setModalState({ isOpen: false });
  };

  const handleCancel = () => {
    modalState.resolver?.(false);
    setModalState({ isOpen: false });
  };

  return (
    <ModalContext.Provider value={{ requestConfirmation }}>
      {children}
      {modalState.options && (
        <ConfirmationModal
          isOpen={modalState.isOpen}
          {...modalState.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ModalContext.Provider>
  );
};

export const useConfirmationModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useConfirmationModal must be used within ConfirmationModalProvider');
  return ctx;
};
